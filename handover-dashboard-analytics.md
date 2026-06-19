# 핸드오버 — 후보자 대시보드 통계 구조 개선

> **작성:** 2026-05-20 / 다음 세션이 그대로 이어받도록 정리한 문서.
> **갱신:** 2026-05-20 — Phase 1 백엔드 코드 작성 → PR #8 제출(사합 리뷰 대기). 상세 §0.
> 탐(Tam)이 다시 설명하지 않아도 되도록 디테일하게 적음.
> 모르는 게 있으면 이 문서 → 명세서 2개 → 실제 코드 순으로 확인할 것.

---

## 0. 한 줄 요약 + 다음 세션이 할 일

**상황:** 후보자 대시보드의 통계 페이지(투데이/분석통계)가 **전부 하드코딩 더미**다.
실제 데이터로 통계를 내려면 백엔드 구조 변경이 필요하고, 그 명세서를 이미 써놨다.

**2026-05-20 세션 완료분:**
1. ✅ host-panel `AnalyticsPage.tsx` 벤치마크 "격차" 열 삭제 — PR #2 (`c2c80ec`).
2. ✅ 명세서 Phase 1.5 §8 섹션(A1~A5) 추가 + 토픽 시드 290개
   (`docs/question-topic-seed.json`) 추출.
3. ✅ 명세서 + 시드 **사합에게 전달 완료.** 사합 회신:
   - 베이스 브랜치 = `dev` (항상 dev에서 분기).
   - `election_types.code` = `nec-{NEC sgTypecode}` 형식.
4. ✅ **ai-avatar-core Phase 1 코드 작성 → PR #8 제출, 사합 리뷰 대기.**
   - 브랜치 `feat/citizen-topic-analytics` (dev 기준), 커밋 `563fd2a`, 14 files +2,237.
   - `question_topic` 테이블 + 마이그레이션 3개 + `TopicMatchService` +
     `chat_turns` 2컬럼 + payload·orchestrator(emit **3곳**)·payment 수정.
     tsc/build/test/lint 전부 통과.
   - ⚠️ `getAnswerRanking` 재작성은 **미포함** — `analytics.service.ts`가
     `feat/analytics-module`에만 있고 `dev`엔 없음.
5. ✅ host-panel 분석 연결 — `api.ts` 분석 클라이언트(8함수) + `TodayPage`·
   `AnalyticsPage` 와이어링(mock fallback). 빌드 검증됨, **미커밋**
   (`feat/candidate-ui-polish`).

**다음 세션이 할 일:**
1. **PR #8 사합 리뷰 코멘트 대응.**
2. `getAnswerRanking` 재작성 — `feat/analytics-module`이 `dev`에 머지된 후.
3. host-panel 분석 연결 미커밋분 — 커밋 여부 결정. 백엔드 엔드포인트가
   `dev`에 올라오면 실데이터 연결 검증.
4. 명세서 §5.3·§11 "two emit sites" → "three" 정정 (캐시히트 emit 포함).

⚠️ **역할:** Phase 1 백엔드 코드는 우리가 작성(사합이 "even with Claude"로 요청).
사합 = 리뷰 + 머지 + 마이그레이션 실행. 사합과의 조율은 탐이 직접.

---

## 1. 후보자 대시보드 구조 [상세]

### 1.1 프론트엔드 — `ai-avatar-host-panel`

- **저장소:** `metarailix/ai-avatar-host-panel`
- **작업 브랜치:** `feat/candidate-ui-polish` → **PR #2** (열려 있음)
- **로컬 경로:** `/Users/jin-woolim/Documents/GitHub/ai-avatar-host-panel`
- **스택:** React + TypeScript + Vite + Tailwind + lucide-react + react-router
- **인증:** JWT. 후보자 로그인 = `candidateLogin()`. 토큰은 후보자 전용
  네임스페이스(localStorage)에 저장.
  - 테스트 계정: `seed-user` / `SeedPassword1!` (메모리 `reference_host_panel_test_login`)
  - 함정: DB `accountType` enum은 `USER`/`HOST`만 존재. 코드의 `CANDIDATE`는
    TS alias로 `'HOST'`. 후보자 계정은 `accountType='HOST'` +
    `electionRole='CANDIDATE'`.

**페이지 구성** (`src/components/panel/`):

| 메뉴(사이드바) | 파일 | 상태 |
|---|---|---|
| 셋팅 > 프로필 | `CandidateProfile.tsx` | 동작 |
| 셋팅 > 캐릭터 | `CandidateAvatarStudio.tsx` | 동작 (페르소나 탭에 질문팩 모달) |
| 운영 > 투데이 | `TodayPage.tsx` | **100% 더미** |
| 운영 > 분석 통계 | `AnalyticsPage.tsx` | **100% 더미** |
| 운영 > 채팅 기록 | `ChatHistoryPage.tsx` | 실데이터 연동 |
| 운영 > 답변 반응 | `AnswerFeedbackPage.tsx` | 실데이터 연동 |
| 운영 > 시민 대화카드 구매 | `PurchasePage.tsx` | 일부 더미 ("사합 논의 중" 뱃지) |

- 라우팅: `/:lang/*` 프리픽스 (`App.tsx`). 로그인 후 기본 진입 = `/today`.
- 사이드바(`Sidebar.tsx`): **셋팅**(프로필·캐릭터) + **운영**(투데이·분석·채팅·반응·구매)
  2개 카테고리. 활성 컬러 보라 `#7c3aed`.
- API 호출 모음: `src/lib/api.ts` (`getCandidateMe`, `candidateLogin`,
  `candidateLogout` 등).
- i18n: `src/lang/ko.ts`(메인 사용) + `en.ts`(이란팀 참고용, 삭제 금지).

### 1.2 백엔드 — `ai-avatar-core`

- **저장소:** `metarailix/ai-avatar-core` (메인 브랜치 `dev`)
- **로컬 경로:** `/Users/jin-woolim/Documents/GitHub/ai-avatar-core`
- **스택:** NestJS + TypeORM + PostgreSQL(pgvector) + WebSocket(realtime)
- **분석 모듈:** 이번에 새로 만듦. 브랜치 `feat/analytics-module`,
  커밋 `cca7223`, **origin에 푸시됨** (아직 `dev`에 머지 안 됨).
  - 위치: `src/modules/analytics/` (module/controller/service/dto/index)
  - 8개 엔드포인트: `GET /candidate/analytics/` 하위
    `today`, `trend`, `satisfaction`, `best-answers`, `worst-answers`,
    `geo-distribution`, `pledge-reactions`, `benchmark`
  - 가짜 DB 데이터로 산수 검증 100% 통과.
  - **하지만 `best-answers`/`worst-answers` 쿼리는 구조적으로 빈 결과** (§2.1 참조).

### 1.3 통계 ↔ 서버 구조 — 현재 상태 [핵심]

```
[시민]  WebSocket 질문
   │
   ▼
realtime-orchestrator.service.ts   ← 질문 임베딩 계산(~250줄), RAG 검색, LLM 답변 생성
   │   TURN_COMPLETED 이벤트 emit (2곳: 비스트리밍~446줄 / 스트리밍~604줄)
   ▼
ChatTurnListener → paymentService.debitTokenForChat()  ← payment.service.ts ~177줄
   │   여기가 chat_turns 테이블 INSERT 단일 지점 + 토큰 차감
   ▼
[DB] chat_turns (대화), chat_message_reactions (👍/👎)
   │
   ▼
analytics 모듈(8 엔드포인트) ──X──▶ 대시보드
                              연결 안 됨!
```

**현재 단절 지점:**
1. 대시보드 `TodayPage.tsx` / `AnalyticsPage.tsx` 는 analytics 엔드포인트를
   **호출조차 안 한다** (`fetch` 0개). 화면 숫자는 전부 코드에 박힌 더미.
2. analytics 모듈은 `dev`에 머지 안 된 별도 브랜치.
3. 머지·연결해도 일부 통계는 데이터 구조상 못 낸다 (§2.1).

### 1.4 데이터 모델 (이번 세션에 직접 확인한 테이블)

| 테이블 | 핵심 컬럼 | 메모 |
|---|---|---|
| `chat_turns` | candidateId, avatarId, conversationId, userId, `userMessage`, `assistantAnswer`, model, *tokens, llmChatId, createdAt | 시민 Q&A 1턴. **답변은 매번 LLM 생성** (model/token 컬럼이 증거) |
| `chat_message_reactions` | candidateId, chatTurnId, userId, `reaction`(LIKE/DISLIKE enum), questionText, answerText, reason, metadata, createdAt | **👍/👎 눌렀을 때만 1행** 생성 |
| `avatar_knowledge` / `avatar_knowledge_chunk` | content, `embedding vector(1536)` | RAG 지식. pgvector, IVFFlat 코사인 인덱스 |
| `candidate_profile` | userId, electoralDistrictId, slogan, greeting … | 후보자 프로필 |
| `candidate_profile_pledge` | profileId, orderIndex, category, title, description, empathyBalance | 공약(구조화됨) |
| `election_types` | code, name, activeStartAt/ExpireAt | `User.electionTypeId` 가 FK |
| `avatar_chat_semantic_cache` | `queryEmbedding vector(1536)` | 유사 질문 답변 캐시 — **이미 존재** |

- `chat_turns.candidateId` = 후보자 `User.id` (HOST 계정).
- pgvector `vector(1536)` 통일. 임베딩 모델은 `embedding.embeddingModel` 설정값.

---

## 2. 통계 개선 방향성 + 구조 변경 [상세]

### 2.1 왜 지금 통계가 안 되나 — 구조적 이유 3가지

1. **노출(조회) 추적이 없음.**
   `chat_message_reactions`는 시민이 👍/👎 누를 때만 행 생성. 답변을 보고 그냥
   나간 시민은 0행. 노출/조회 카운터가 어디에도 없음.
   → "142회 노출" 같은 숫자는 **DB가 만들 수 없는 값.**

2. **묶을 키가 없음.**
   `assistantAnswer`는 매번 LLM이 새로 생성 → 답변 문자열이 사실상 전부 고유.
   같은 질문이어도 답이 다 다름 → 집계 기준 없음.

3. **`getAnswerRanking` 쿼리가 구조적으로 빈 결과.**
   `analytics.service.ts`가 `GROUP BY COALESCE("chatTurnId", md5("answerText"))`
   로 묶는데, `chatTurnId`는 턴마다 고유 → 그룹당 반응 1개 →
   `HAVING COUNT(*) >= 10` 필터에 전부 걸러짐 → 항상 빈 리스트.

**되는 것 / 안 되는 것:**
- ✅ 후보자 전체 공감/비공감 합계, 만족도 % (오늘 만족도 도넛은 진짜 가능)
- ❌ 답변별 랭킹("좋은/다듬을 답변 TOP 3"), 노출 횟수

### 2.2 해결책 — "토픽(표준 질문) 태깅"

시민 질문에 **자동으로 주제 꼬리표**를 단다. 시민은 아무것도 안 함(태그 존재도
모름). 서버가 질문 문장을 읽고 표준 질문 카탈로그와 비교해 가장 가까운 주제로
분류 → `chat_turns`에 `matchedTopicId` 저장.

그러면:
- **노출 횟수 = 토픽별 `chat_turns` 개수** (별도 카운터 불필요, 공짜)
- 공감률 = 반응을 토픽 키로 join
- "좋은/다듬을 답변 TOP 3" = 토픽별 공감률 정렬 → 진짜 데이터로 나옴

**비용 0 포인트:** 채팅 오케스트레이터가 시민 질문 답하려고 **이미 임베딩을
계산**한다. 그 임베딩을 그대로 재사용해 토픽 매칭 → 추가 LLM/임베딩 호출 없음.

### 2.3 채팅 흐름 — 어디에 끼워 넣나

1. `ChatTurnCompletedPayload` (`src/events/payloads/chat-turn.payload.ts`)
   에 `matchedTopicId`, `matchSimilarity` 필드 추가.
2. `realtime-orchestrator.service.ts` — 임베딩 계산 후 새 `TopicMatchService`
   호출, `turnPayload`에 세팅. ⚠️ **emit 지점 2곳(~446, ~604) 모두** 세팅.
3. `payment.service.ts` `debitTokenForChat` (~177줄) — `chat_turns` INSERT 시
   두 필드 저장.
- 분류 실패해도 두 필드 `null` 폴백 → **턴은 정상 저장. 채팅 절대 안 막힘.**

### 2.4 명세서 파일 — 이미 작성됨

| 파일 | 용도 |
|---|---|
| `docs/citizen-topic-analytics-spec.md` | **사합 전달용 (영문, 정식)** |
| `docs/citizen-topic-analytics-spec.ko.md` | **탐 검토용 (한글)** — 내용 동일 |

명세서 핵심 구조:
- **신규 테이블 `question_topic`** — 선거유형별 표준 질문 카탈로그 +
  `embedding vector(1536)`
- **`chat_turns` 수정** — `matchedTopicId`(FK, nullable), `matchSimilarity`
- **신규 서비스 `TopicMatchService`** — pgvector 코사인 최근접 매칭
- **마이그레이션 3개** — 생성/변경/시드, 전부 `down()` 완비 → 되돌리기 가능
- **`analytics.service.ts` 재작성** — `getAnswerRanking`을 토픽 그룹핑으로

### 2.5 단계 구분 (대혼란 방지 — 탐이 강조한 부분)

| 단계 | 범위 | 위험 | 동작 변화 |
|---|---|---|---|
| **Phase 1** | 토픽 카탈로그 + 턴 분류 + 분석 쿼리 수정 | 낮음(추가·nullable) | 없음 |
| **Phase 1.5** | 안전·운영 가드 (§3 A1~5) — *명세서에 추가 예정* | 낮음 | 없음 |
| **Phase 2** | 후보자 등록 답변(`candidate_topic_answer`) + 채팅이 그걸 제공 | 중간 | **있음** → 별도 명세 |

**안전장치(명세서에 명시됨):** 모든 신규 컬럼 nullable / 기존 데이터 무손상 /
분류 실패가 채팅을 막지 않음 / 모든 마이그레이션 되돌리기 가능.

**사전답변 안 적은 후보자?** — Phase 1 통계는 후보자가 뭘 적었는지와 무관(시민
질문에 태그가 붙음) → **통계 다 나옴.** 답변은 등록 안 했으면 지금처럼 AI 생성.
손해 보는 후보자 없음.

---

## 3. 추가 아이디어 — Phase 1.5 (명세서 §8에 반영 완료)

✅ **A1~A5 전부** 명세서 §8 "Phase 1.5 — 안전·운영 가드"로 반영됨 (2026-05-20).
아래는 원본 아이디어 메모. B/C/D는 미반영 (B=host-panel 우리 작업,
C=Unity 별도 트랙, D=나중).

**A. 백엔드 명세에 같이 넣기 좋음 (싸다, 토픽 구조에 얹힘):**
- **A1. 미응답 인기 주제 알림** — 많이 묻는데 후보자 답변 없는 주제 → "등록하세요"
- **A2. 부정 반응 급증 경보** — 한 주제에 비공감 몰리면 "이 답변 반응 나빠요" 알림
- **A3. 시민 질문 → 공약 자동 연결** — 토픽을 `candidate_profile_pledge`에 연결
- **A4. 개인정보 마스킹** — 시민이 질문에 전화/주소 적으면 저장 전 자동 가림
- **A5. 지어내기 방지 + 욕설 필터**
  - 지어내기 방지: `matchSimilarity` 낮음 = 후보자가 안 다룬 영역 →
    AI가 답 지어내지 말고 "후보자가 아직 입장 정리 안 함" → **선거법 안전, 비용 0**
  - 욕설/혐오/음란: OpenAI 모더레이션 API(무료)로 입력 시 1회 필터

**B. 대시보드 쪽 (우리가 host-panel에서 직접):**
- B1. 주제별 강약 한눈에 (색상)  B2. 시간대별 질문 패턴

**C. 시민 앱 쪽 (Unity = `ai-avatar-endpoint`, 사합/별도 트랙):**
- C1. **추천 질문 버튼** — 채팅 열면 "청년주거" "교통" 버튼 탭. 표준 카탈로그
  재사용이라 거의 공짜. 메모리의 기존 "예상질문버튼" plan과 합치면 됨.

**D. 조심 / 나중:**
- 공직선거법 108조 — Q&A 외부 공유 카드는 법적 검토 먼저
- 공격성 함정 질문("OO후보 비리?") 대응 — 중간 규모

---

## 4. 잔여 작업 / 미커밋 변경

- ✅ **host-panel `AnalyticsPage.tsx`** — 벤치마크 표 "격차(Gap)" 열 삭제,
  PR #2(`feat/candidate-ui-polish`)에 커밋+푸시 완료 (`c2c80ec`, 2026-05-20).
- host-panel PR #2 최신 푸시 커밋 = `c2c80ec`.
- 보류된 항목 (탐이 "나중에" 라고 명시):
  - `question-bank.html` iframe에서 질문이 안 보이는 버그 디버그
  - 후보 선거유형(단체장/지방의원/교육감)에 맞는 직급만 활성화
  - 캐릭터 스튜디오 지식 학습 → 실제 백엔드 `POST .../knowledge` 연결 (코드에 TODO)

## 5. 사합 통합 요청 리스트 (누적)

- ✅ 토픽 분석 명세서 + 시드 데이터 — 전달 완료. Phase 1 구현은 **PR #8**
  (`feat/citizen-topic-analytics` → `dev`)로 제출, 사합 리뷰 대기.
- 사이드바 큰 텍스트 "후보자 대시보드" → "일꾼을묻다" (운영 서버 반영 확인)
- `NEC_IMPORT_TYPECODES` 정정: `3,4,5,7,9` → `3,4,5,6,11` (구의원 7→6, 교육감 9→11)
- 답변 길이 / 시민 하루 대화량 제한 엔드포인트 (현재 대시보드는 더미 UI)
- 영상 가격: 첫 영상 가입비 포함 + 재요청 5,000원 (백엔드 결제 로직)
- Unity 저장소(`ai-avatar-endpoint`) write 권한 — 시민 주소 드롭다운 수정용

## 6. 참고 — 경로·브랜치 총정리

| 항목 | 값 |
|---|---|
| 작업 디렉토리 | `/Users/jin-woolim/Documents/GitHub/Find-Leaders` |
| host-panel | `/Users/jin-woolim/Documents/GitHub/ai-avatar-host-panel` — 브랜치 `feat/candidate-ui-polish` (PR #2) |
| 백엔드 | `/Users/jin-woolim/Documents/GitHub/ai-avatar-core` |
| 백엔드 — 분석 모듈 | 브랜치 `feat/analytics-module` (`cca7223`) — `dev` 미머지. `getAnswerRanking` 이 브랜치에 있음 |
| 백엔드 — Phase 1 토픽 | 브랜치 `feat/citizen-topic-analytics` → **PR #8** (`563fd2a`, 사합 리뷰 대기) |
| Unity 시민앱 | `metarailix/ai-avatar-endpoint` (별도) |
| 명세서(영) | `docs/citizen-topic-analytics-spec.md` — 사합 전달용 정식본 |
| 명세서(한) | `docs/citizen-topic-analytics-spec.ko.md` — 탐 검토용 |
| 토픽 시드 데이터 | `docs/question-topic-seed.json` — 290개, 마이그레이션 C 입력 |
| 이 핸드오버 | `handover-dashboard-analytics.md` |

**선거 일정:** 5/21 선거운동 시작, **6/3 본선**. (이전 6/13은 오류였음)

## 7. 주의사항 — 실수하면 안 되는 것

- **Phase 1 백엔드 코드는 우리가 작성**(사합이 "even with Claude"로 요청) → PR.
  사합이 리뷰·머지·마이그레이션 실행. 사합과의 조율은 탐이 직접.
- **사합 = 이란/페르시아어 개발자(`f-kazemi-dev`).** 명세서·메시지·PR 본문은
  영어로. 한국어 못 읽음.
- **사합 영역 충돌 조율은 탐이 직접.** 우리는 콜 받으면 코드/명세만.
- 패스워드 절대 받지 말 것. API 키/시크릿/토큰만.
- `.env` 출력 시 `*KEY*`/`*SECRET*`/`*PASSWORD*`/`*TOKEN*` 값 `****` 마스킹.
- ko.ts가 메인, en.ts 삭제 금지(이란팀 참고용).
- UI 작업 시 아이콘·SVG·로고 디자인/위치/사이즈는 명시 요청 없으면 변경 금지.
- 통계 = "보여주는 기능은 = 실제 동작하는 기능". 과장 광고 금지(탐 핵심 원칙).
```
