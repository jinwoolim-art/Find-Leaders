# 시민 Q&A 토픽 분류 — 백엔드 명세서 (한글 검토용)

> 이 파일은 **탐님 검토용 한글본**입니다.
> 사합에 보낼 정식 문서는 영문본 `citizen-topic-analytics-spec.md` 입니다.

**대상 저장소:** `metarailix/ai-avatar-core` (브랜치 `dev`)
**작성:** 탐 (기획) + Claude
**상태:** 사합 검토 대기 초안
**최종 수정:** 2026-05-20

---

## 1. 배경 — 왜 필요한가

후보자 대시보드에는 **"오늘 좋은 답변 TOP 3"**, **"다듬을 답변 TOP 3"**,
노출 횟수, 토픽별 만족도 같은 통계가 들어갑니다.

현재 백엔드를 점검한 결과, **이 통계들은 실제 데이터로 만들 수 없습니다.**
구조적인 이유 3가지:

1. **노출(조회) 추적이 없음.**
   `chat_message_reactions` 테이블은 시민이 👍/👎 를 눌렀을 때만 1행이 생깁니다.
   답변을 읽고 그냥 나간 시민은 아무 행도 안 남깁니다. 노출/조회를 세는 카운터가
   어디에도 없습니다. → "142회 노출" 같은 숫자는 DB가 만들어낼 수 없는 값입니다.

2. **묶을 키가 없음.**
   `chat_turns.assistantAnswer`(AI 답변)는 매번 LLM이 새로 생성합니다
   (`avatar_knowledge_chunk` 기반 RAG). 같은 질문을 한 두 시민도 서로 다른
   답변 문자열을 받습니다. 집계할 안정적인 기준이 없습니다.

3. **랭킹 쿼리가 구조적으로 빈 결과.**
   `analytics.service.getAnswerRanking`는
   `COALESCE("chatTurnId", md5("answerText"))`로 그룹핑하는데, `chatTurnId`는
   턴마다 고유 → 그룹당 반응 1개 → `HAVING COUNT(*) >= 10` 필터에 전부 걸러짐.

이 명세서는 **안정적인 묶음 키 — "토픽(표준 질문)"** 을 도입해서, 시민의
대화를 집계·카운트·랭킹할 수 있게 만듭니다.

추가로 **효율 효과(2단계)** 도 생깁니다: 질문이 토픽에 매칭되면, 그 토픽에 대해
후보자가 미리 등록한 답변을 LLM 생성 대신 제공할 수 있습니다 — 더 빠르고,
토큰 비용 낮고, 답변 일관성 ↑, 후보자가 검수한 답변이라 선거법상 더 안전.

---

## 2. 목표

- 모든 `chat_turns` 행에 nullable `matchedTopicId` 부여
- 노출 횟수 = 토픽별 `chat_turns` 개수 (별도 카운터 불필요, 공짜)
- 만족도 / 좋은 답변 / 다듬을 답변 랭킹을 토픽 단위로 집계
- **추가·되돌리기 가능하게** — 1단계는 동작 변화 0

---

## 3. 단계 구분 (대혼란 방지)

| 단계 | 범위 | 위험도 | 동작 변화 |
|------|------|--------|-----------|
| **1단계** | 토픽 카탈로그 + 턴별 분류 + 분석 쿼리 수정 | 낮음 — 추가만, nullable 컬럼 | 없음 — 채팅 답변 그대로 |
| **1.5단계** | 안전·운영 가드 (§8 — A1~A5) | 낮음~중간 — 읽기전용 A1/A2, 추가형 A3, 파이프라인 가드 A4/A5 | A1~A3 없음 / A4·A5 입력 처리·답변 생성에 가드 추가 |
| **2단계** | 후보자 등록 답변 + 채팅 파이프라인이 그걸 제공 | 중간 — 답변 생성 방식 변경 | 있음 — 별도 명세 필요 |

**이 문서의 핵심 결과물은 1단계입니다.** 1.5단계(§8)는 토픽 구조에 얹히는
저비용 가드 묶음입니다. 2단계는 §9에 개요만, 1단계 적용 후 별도 명세서로
진행합니다.

---

## 4. 1단계 — 데이터 모델

### 4.1 신규 테이블: `question_topic`

질문/토픽 표준 카탈로그. 1행 = 표준 질문 1개.
선거유형(단체장 / 지방의원 / 교육감)별로 구분.

```sql
CREATE TABLE "question_topic" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "electionTypeId"  uuid NULL REFERENCES "election_types"("id") ON DELETE CASCADE,
  -- electionTypeId 가 NULL = 모든 선거유형 공통 (기본 질문 세트)
  "category"        varchar(80)  NOT NULL,   -- 예: '청년', '교통', '복지', '교육'
  "questionText"    text         NOT NULL,   -- 표준 질문 문장
  "orderIndex"      int          NOT NULL DEFAULT 0,
  "isActive"        boolean      NOT NULL DEFAULT true,
  "embedding"       vector(1536) NULL,        -- questionText 의 임베딩
  "createdAt"       timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX "IDX_question_topic_electionType_active"
  ON "question_topic" ("electionTypeId", "isActive");

CREATE INDEX "IDX_question_topic_embedding"
  ON "question_topic" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 50);
```

메모:
- `vector(1536)` 은 `avatar_knowledge_chunk.embedding` 과 동일 — `embedding.embeddingModel`
  설정과 **같은 임베딩 모델 사용**. 그 모델 차원이 1536이 아니면 양쪽 다 맞춰야 함.
- `embedding` 은 nullable — 텍스트만 먼저 시드하고, 임베딩은 일회성 스크립트로
  채움 (§6.3).

### 4.2 기존 테이블 수정: `chat_turns`

```sql
ALTER TABLE "chat_turns"
  ADD COLUMN "matchedTopicId"   uuid  NULL
    REFERENCES "question_topic"("id") ON DELETE SET NULL,
  ADD COLUMN "matchSimilarity"  real  NULL;

CREATE INDEX "IDX_chat_turns_matchedTopic_created"
  ON "chat_turns" ("matchedTopicId", "createdAt");
```

- `matchedTopicId` — 시민 질문이 분류된 토픽. `NULL` = "미분류"(임계값을 넘는
  토픽 없음). 그래도 턴은 정상 저장됨. 토픽 귀속만 안 될 뿐.
- `matchSimilarity` — 최고 매칭의 코사인 유사도(0~1). 임계값 튜닝·진단용.
  선택사항이지만 저렴하고 매우 유용.

**두 컬럼 모두 nullable.** 기존 행은 손대지 않음. 완전히 되돌리기 가능.

---

## 5. 1단계 — 분류 로직

### 5.1 어디서 실행되나

채팅 오케스트레이터는 **모든 시민 메시지에 대해 이미 질문 임베딩을 계산**합니다
(RAG 검색용):

- `realtime-orchestrator.service.ts` ≈ 250번째 줄
  `const embResult = await this.embeddingService.generateEmbeddingWithUsage(cleaned);`
  `queryEmbedding = embResult.embedding;`

이 임베딩을 그대로 재사용. **추가 LLM·임베딩 호출 불필요.**

### 5.2 신규 서비스: `TopicMatchService`

```ts
// 의사 코드
async match(queryEmbedding: number[], electionTypeId: string | null):
    Promise<{ topicId: string; similarity: number } | null> {

  const literal = `[${queryEmbedding.join(',')}]`;
  const rows = await dataSource.query(`
    SELECT "id",
           1 - ("embedding" <=> $1::vector) AS similarity
    FROM "question_topic"
    WHERE "isActive" = true
      AND "embedding" IS NOT NULL
      AND ("electionTypeId" = $2 OR "electionTypeId" IS NULL)
    ORDER BY "embedding" <=> $1::vector
    LIMIT 1
  `, [literal, electionTypeId]);

  const top = rows[0];
  if (!top || top.similarity < SIMILARITY_THRESHOLD) return null;
  return { topicId: top.id, similarity: top.similarity };
}
```

- `<=>` = pgvector 코사인 거리; `1 - 거리` = 코사인 유사도.
- `SIMILARITY_THRESHOLD` — 설정값. 초기값 **0.78** 제안; 실제 트래픽으로 튜닝(§10).
- 임계값 미만 → `null` 반환 → `matchedTopicId` 는 `NULL` 유지.
- 후보자의 `electionTypeId` 는 `chat_turns.candidateId` 에 해당하는
  `user.electionTypeId` 에서 가져옴. 오케스트레이터가 이미 아바타/후보자를
  로드하므로 전달만 하면 됨.

### 5.3 턴 payload 연결

`matchedTopicId` 와 `matchSimilarity` 가 오케스트레이터 → 저장 단계까지 흘러야 함:

1. **`ChatTurnCompletedPayload`** (`src/events/payloads/chat-turn.payload.ts`) —
   필드 2개 추가:
   ```ts
   matchedTopicId: string | null;
   matchSimilarity: number | null;
   ```
2. **`realtime-orchestrator.service.ts`** — 임베딩이 준비된 후
   `TopicMatchService.match(...)` 호출, `turnPayload` 구성 시 두 필드 세팅.
   ⚠️ **emit 지점이 3곳** — 비스트리밍, 스트리밍, 캐시히트(시맨틱 캐시).
   **셋 다** 세팅해야 함 (캐시히트 턴도 실제 시민 질문 → 노출 집계 포함).
3. **`debitTokenForChat`** (`payment.service.ts` ≈ 177줄) —
   `manager.create(ChatTurn, { ... })` 에 두 필드 포함.

`TopicMatchService` 가 에러를 던지거나 `queryEmbedding` 이 없으면 두 필드는
`null` 로 폴백 — 턴은 그대로 저장됨.
**분류 실패가 절대 채팅 턴을 막거나 실패시켜선 안 됨.**

---

## 6. 1단계 — 마이그레이션 & 시드

`src/migrations/` 의 기존 타임스탬프 명명 규칙을 따름.

### 6.1 마이그레이션 A — `CreateQuestionTopic`
`question_topic` 테이블 + 인덱스 + IVFFlat 인덱스 생성 (§4.1).
`CREATE EXTENSION IF NOT EXISTS vector` 필요 (지식 마이그레이션에서 이미 활성화됨;
재실행해도 안전).

### 6.2 마이그레이션 B — `AddMatchedTopicToChatTurns`
`chat_turns` 에 `matchedTopicId`, `matchSimilarity`, FK, 인덱스 추가 (§4.2).

### 6.3 마이그레이션 C — `SeedQuestionTopics`
표준 토픽 행 삽입 (텍스트 + 카테고리 + 선거유형 + orderIndex).
- **시드 데이터는 `docs/question-topic-seed.json` 로 제공** — `question-bank.html`
  / `assets/question-bank.js` 에서 추출한 토픽 290개: 공통 50개
  (`electionType: null`) + `headOfLocal`·`councilor`·`superintendent` 각 80개.
  필드 매핑은 파일의 `_meta` 블록 참조.
- 공통 50개 중 10개는 운영사 답변 토픽(`audience: operator`) — 시민이 실제로
  묻는 질문이라 분류·집계 대상으로 그대로 포함.
- `electionType` 키(`headOfLocal`/`councilor`/`superintendent`)는 마이그레이션
  시점에 `election_types.id` 로 해석해야 함 — §10 참조.
- `embedding` 은 시드 시점에 `NULL`.
- 일회성 스크립트(또는 가드된 부팅 단계)가 `embedding IS NULL` 인 모든
  `question_topic` 행의 임베딩을 `EmbeddingService` 로 생성. 멱등 —
  토픽 추가 시 재실행 가능.

### 6.4 되돌리기
- 모든 마이그레이션에 깔끔한 `down()`: 컬럼 삭제 / 테이블 삭제.
- `matchedTopicId` 는 nullable → 데이터 손실 없음, 출시에 백필 불필요.
- **과거 `chat_turns` 백필은 선택사항** — §10 참조.

---

## 7. 1단계 — 분석 모듈 영향

`feat/analytics-module` 브랜치의 분석 모듈을 수정해야 함:

- **`getAnswerRanking` (좋은/다듬을)** — 깨진
  `GROUP BY COALESCE("chatTurnId", md5("answerText"))` 를
  `GROUP BY ct."matchedTopicId"` 로 교체, 라벨용으로 `question_topic` 조인.
  노출 = 토픽별 `COUNT(ct.*)`. 공감률 = `chatTurnId` 로 반응 조인.
  `HAVING COUNT(ct.*) >= minExposures` 유지.
- **`today` / `trend` / `satisfaction`** — 로직은 그대로; 토픽 한정 뷰가 필요하면
  `WHERE ct."matchedTopicId" IS NOT NULL` 추가 가능.
- 기존 **코호트 < 3 프라이버시 가드** 유지.
- UI 라벨: 토픽 데이터가 쌓이기 전까지 "오늘 좋은 답변" 은 누적으로 표기하거나
  빈 상태를 우아하게 처리 — 단 이건 프론트 변경이라 이 문서 범위 밖.

---

## 8. 1.5단계 — 안전·운영 가드

1.5단계는 **1단계 토픽 구조에 얹히는** 저비용 가드 묶음입니다. 어느 것도 채팅
파이프라인이 이미 하는 것 이상의 임베딩·LLM 호출을 추가하지 않습니다. 사합이
규모를 가늠할 수 있도록 나열하며, 각 항목은 독립적으로 출시 가능하고 어느
것이든 미룰 수 있습니다.

- **A1, A2는 읽기 전용** 분석 쿼리 — 파이프라인 위험 0.
- **A3**은 추가 스키마 (nullable 컬럼 1개 + FK).
- **A4, A5**는 채팅 파이프라인 안에 가드를 넣어 좁은 범위에서 입력/답변 처리를
  바꿉니다 — 항목별로 표기, 둘 다 fail-open.

### A1 — 미응답·취약 인기 주제

**무엇:** 토픽을 노출수(`COUNT(chat_turns)`)로 정렬해 많이 묻는데 답변이 약한
주제를 표시 → 후보자가 어디에 집중할지 안내.
**1단계에서 "약함" 신호:** 해당 토픽의 낮은 공감률 / 낮은 만족도.
**2단계 이후:** `PUBLISHED` 상태 `candidate_topic_answer`(§9)가 없는 토픽도
"약함"에 포함 → "여기에 답변을 등록하세요".
**어떻게:** 신규 분석 엔드포인트, 예 `GET /candidate/analytics/topic-gaps`.
§7의 토픽 그룹핑 재사용. 스키마 변경 없음.
**위험:** 없음(읽기 전용). **동작 변화:** 없음.

### A2 — 부정 반응 급증 경보

**무엇:** 최근 구간에서 한 토픽에 👎(DISLIKE) 반응이 과도하게 몰리면
"이 답변 반응이 나쁩니다" 표시.
**어떻게:** `chat_message_reactions`를 `chat_turns.matchedTopicId`로 조인하는
스케줄 쿼리(또는 대시보드 로드 시 계산). DISLIKE 비율이 설정 임계값을 넘고
노출수가 기존 코호트 최소 가드를 만족하면 경보. 전달 방식(대시보드 뱃지 vs
푸시)은 탐/사합 결정.
**위험:** 없음(읽기 전용). **동작 변화:** 없음.

### A3 — 시민 질문 → 공약 연결

**무엇:** 토픽을 후보자의 구조화된 공약(`candidate_profile_pledge`)에 연결해
"토픽 X를 묻는 시민 ↔ 당신의 공약 Y, 그 반응"을 대시보드에 표시.
**어떻게(저렴한 경로):** 각 `candidate_profile_pledge`를 한 번 임베딩 —
nullable `embedding vector(1536)` 컬럼 추가, 토픽 임베딩과 같은 일회성
스크립트로 채움(§6.3). 오케스트레이터에서 **이미 계산된** 시민 질문 임베딩을
해당 후보자의 공약들과 매칭, `chat_turns`에 nullable `matchedPledgeId` 저장.
시민 질문에 대한 추가 임베딩 호출 없음.
**위험:** 낮음 — nullable 컬럼 + FK 추가, 되돌리기 가능.
**동작 변화:** 없음 — 메타데이터만, 답변 생성 무변경.
**확인 필요:** 후보자당 공약 개수가 선형 스캔으로 충분히 작은지 사합 확인.

### A4 — 시민 입력 개인정보 마스킹

**무엇:** 시민이 질문에 개인정보(전화번호, 이메일, 주민등록번호)를 적으면
`chat_turns.userMessage` / `chat_message_reactions`에 저장되기 **전에**, 그리고
LLM에 전달되기 전에 마스킹.
**어떻게:** 오케스트레이터가 이미 `cleaned` 입력을 만드는 지점(§5.1)에 정규식
새니타이저 적용. 전화/이메일/주민번호 패턴은 신뢰성 높음. 자유 형식 도로명
주소는 best-effort일 뿐이며 보장으로 약속하면 안 됨.
**위험:** 낮음 — 추가만, 스키마 변경 없음.
**동작 변화:** 저장·LLM 전달 텍스트가 마스킹본으로 바뀜. 시민 화면 경험은
그대로. 마스킹이 절대 턴을 떨어뜨려선 안 됨 — 새니타이저 오류 시 원문 저장.

### A5 — 지어내기 방지 + 욕설 필터

채팅 파이프라인 안의 독립적인 fail-open 가드 2개:

**A5a — 지어내기 방지.** 시민 질문에 대한 RAG 지식 검색이 낮은 유사도 청크만
반환하면(후보자 지식 베이스가 그 영역을 안 다룸), LLM에게 **입장을 지어내지
말 것**을 지시 — 지어낸 답변 대신 "후보자가 아직 이 사안에 입장을 밝히지
않았습니다"로 응답. 검색 유사도는 이미 계산돼 있어 비용 0, 선거법상 더 안전.
*주의:* 신호는 **RAG 지식 검색** 점수(후보자 커버리지)이며, `matchSimilarity`
(표준 토픽과의 근접도)와는 다름.
**동작 변화:** 있음 — 단 커버리지 낮은 꼬리 구간에서만, 설정 임계값으로 제어.

**A5b — 욕설/혐오/음란 필터.** 시민 입력을 인입 시점에 모더레이션 검사로 1회
통과(예: OpenAI 모더레이션 API — 무료). 플래그되면 우아하게 처리(정중히 거절,
정상 턴으로 저장하지 않음).
**동작 변화:** 플래그된 입력은 답변 대신 거절.

**위험(A5):** 낮음~중간 — 파이프라인 가드, 둘 다 설정 가능 + fail-open: 가드
오류 시 현재 동작으로 폴백, 정상 턴을 절대 막지 않음.

### 권장 순서

A1 + A2 먼저(읽기 전용, 위험 0, 대시보드에 즉시 가치) → A3(추가 메타데이터)
→ A4 + A5(파이프라인 가드, 검토 가장 많이 필요). 이번 라운드를 순수 추가형으로
유지하고 싶으면 A4·A5는 별도 미니 명세로 분리 가능.

---

## 9. 2단계 — 후보자 등록 답변 (개요, 추후 별도 명세)

토픽이 생기면, 후보자가 토픽별로 검수된 답변을 등록할 수 있음:

```sql
CREATE TABLE "candidate_topic_answer" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "candidateId"  uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "topicId"      uuid NOT NULL REFERENCES "question_topic"("id") ON DELETE CASCADE,
  "answerText"   text NOT NULL,
  "status"       varchar(16) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | PUBLISHED
  "createdAt"    timestamptz NOT NULL DEFAULT now(),
  "updatedAt"    timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("candidateId", "topicId")
);
```

채팅 파이프라인 변경: `matchedTopicId` 가 잡히고 `PUBLISHED` 상태의
`candidate_topic_answer` 가 있으면 → 새 RAG 생성 대신 그 답변을 제공/우선.
이건 **동작 변경**이라 별도 명세 필요 (폴백 규칙, 부분 커버리지, 톤 블렌딩,
캐싱). 이번 라운드 아님.

---

## 10. 사합에게 물어볼 항목

1. **임베딩 차원** — `embedding.embeddingModel` 이 1536차원 벡터를 만드는지 확인.
   아니면 `question_topic.embedding` 을 맞춰서 조정.
2. **유사도 임계값** — 0.78로 시작? 실제 트래픽에서 `matchSimilarity` 분포를
   ~1주 관찰 후 튜닝 예상.
3. **과거 데이터 백필** — 기존 `chat_turns` 를 소급 분류(일회성 잡)할지, 아니면
   앞으로 들어오는 것만 분류해도 되는지. 앞으로만 하는 게 단순·저위험 — 출시엔
   forward-only 권장.
4. **토픽 임베딩 생성** — 부팅 시 가드된 단계 vs 독립 스크립트?
5. **토픽당 다중 표현** — 1단계는 토픽당 임베딩 1개(센트로이드). 정확도가 낮으면
   `question_topic_phrase` 자식 테이블(토픽당 예시 표현 여러 개 임베딩, 그 중
   아무거나 매칭)이 계획된 보완책. 미루어도 되나?
6. **선거유형 매핑** — `question-topic-seed.json` 의 `electionType` 키
   (`headOfLocal` / `councilor` / `superintendent`)를 어느 `election_types` 행에
   대응시킬지 확인 → 마이그레이션 C가 `electionTypeId` 로 해석.

---

## 11. 범위 밖

- 프론트 / 대시보드 UI 변경 (`ai-avatar-host-panel` 에서 별도 처리)
- RAG 지식 파이프라인(`avatar_knowledge*`) 변경
- 임베딩 유사도 외 자유 텍스트 NLP
- 2단계 답변 제공 동작 (별도 명세)

---

## 12. 사합용 변경 요약

**신규:**
- 테이블 `question_topic` (+ IVFFlat 인덱스)
- 서비스 `TopicMatchService`
- 마이그레이션 3개 (생성 / 변경 / 시드)

**수정:**
- `chat_turns` — `+matchedTopicId`, `+matchSimilarity` (nullable)
- `ChatTurnCompletedPayload` — 필드 2개
- `realtime-orchestrator.service.ts` — 토픽 매칭 호출, **emit 3곳 모두** 필드 세팅 (비스트리밍/스트리밍/캐시히트)
- `payment.service.ts debitTokenForChat` — 필드 2개 저장
- `analytics.service.ts` — `getAnswerRanking` 토픽 그룹핑으로 재작성

**보장:**
- 추가·nullable 컬럼 — 기존 데이터 무손상
- 분류 실패가 채팅 턴을 절대 막지 않음
- 모든 마이그레이션 완전 되돌리기 가능

**1.5단계(§8):** 선택적 안전·운영 가드(A1~A5), 각각 개별 산정·출시 —
위 1단계 변경 목록에는 포함 안 됨.
