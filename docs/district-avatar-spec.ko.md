# 선거구 통합 아바타 명세 (한국어) — Phase 1

작성일: 2026-05-24
작성자: 탐 + 클로드_4
대상: 사합 ai-avatar-core 백엔드 팀 (영문 번역본 `district-avatar-spec.md` 별도)

---

## 1. 배경 / 목적

- 시민이 자기 선거구의 후보 목록 + NEC 등록 공약을 **통합 AI 아바타**와 대화하며 비교
- "후보자별 1:1 아바타"와 별개로, **선거구 단위 중립 안내봇** 신설
- 6/3 본선 전 시연 가능 수준 (1주 스프린트)
- 운영 컨트롤은 관리자(탐) 단독, 후보자는 편집 불가 (중립성)

---

## 2. 범위

### Phase 1 (이번 스프린트, 1주)
- 시민용 단독 채팅 페이지 `district-avatar.html`
- 관리자 컨트롤 페이지 `district-avatar-admin.html`
  - 선거구 검색 + ON/OFF 토글 + 아바타 자산 URL 1개
- 사합 백엔드 신규 endpoint 3개 (5절 참조)
- 응답 4가지: ①선거구 후보 목록 ②각 후보 공약 요약 ③후보 간 공약 비교 ④절차/날짜 FAQ
- 가드레일: 특정 후보 추천 / 당락 예측 / 정당 평가 금지
- 시민 모드 2개: **전체 모드** (주소지 미설정) / **주소지 기반 모드** (설정 후)

### Phase 2 (6/3 이후 / 운영용, 본 명세 제외)
- FAQ CRUD (관리자가 절차/날짜 답변 직접 입력)
- 가드레일/응답 톤 텍스트 커스터마이즈
- 대화 로그 검수 (좋은답변/나쁜답변 마킹 → RAG 튜닝)
- 영상 아바타 (Phase 1은 정지 이미지)

---

## 3. 시민용 페이지 (`district-avatar.html`)

### 3.1 URL
- 기본: `/district-avatar.html`
- 옵션 query: `?sgId=&sgTypecode=&province=&sigungu=&sgg=`
- 진입 경로: `ilgun-platform-v3.html` 메인 메뉴에서 "선거구 안내봇" 버튼 → 새 페이지 열기

### 3.2 UX 흐름
1. **진입 시**: 주소지 미설정 → **전체 모드**. 절차/날짜 FAQ만 응답. 후보 목록·공약 질문이 오면 "내 동네를 설정해주세요" 유도.
2. **"내 동네 설정" 버튼** → 시도 → 시군구 → 읍면동 드롭다운 → 확정 (선거 종류 선택 없음)
3. **확정 후**: 해당 주소지에 해당하는 **모든 선거 종류 후보를 한 화면에** 표시 (5종 동시: 시장/구청장/시의원/구의원/교육감 등 선거 일정에 따라). 선거 종류 탭으로 섹션 분리.
4. **채팅창 헤더**: "지금 대화 중: [시장 선거 ▾]" 토글. 시민이 어느 선거의 후보를 묻는지 명시. 기본값: 가장 상위 단위(시장 또는 구청장).
5. **채팅창 본문**: 사용자 질문 → `POST /district-chat` (현재 토글 sgTypecode 포함) → 답변 본문 + 인용 카드(후보 이름 + 출처 공약 스니펫).

### 3.3 화면 구성 (와이어프레임)
```
┌─────────────────────────────────────────────┐
│ [일꾼이 로고]  내 동네: 종로구 ▾  [재설정]   │
├─────────────────────────────────────────────┤
│ [통합 아바타 정지 이미지 / placeholder]      │
│ "안녕하세요, 종로구 안내봇입니다."           │
├─────────────────────────────────────────────┤
│ ▶ 우리 동네 모든 선거 후보                  │
│ ┌─시장─┬─시의원─┬─구의원─┬─교육감─┐         │
│ │ [후보1][후보2][후보3] (시장 3명)         │
│ │ ─                                        │
│ │ [후보4][후보5] (시의원 2명)             │
│ │ ─                                        │
│ │ [후보6][후보7][후보8] (구의원 3명)      │
│ │ ─                                        │
│ │ [후보9] (교육감 1명)                    │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 채팅:                                       │
│ ─── 지금 대화 중: [시장 선거 ▾] ───         │
│  봇> 무엇이 궁금하세요?                     │
│  나> 우리 동네 교육 공약 비교해줘            │
│  봇> [본문]                                 │
│      📎 [후보A의 공약X] [후보B의 공약Y]     │
│      ─────                                  │
│      ⚖ 최종 판단은 시민님께                 │
├─────────────────────────────────────────────┤
│ [질문 입력란]                       [전송]  │
└─────────────────────────────────────────────┘
```

### 3.4 가드레일 표시 (시민 UI 단)
- 페이지 상단 안내 배너: "본 답변은 NEC 등록 공약 기반 안내입니다. 특정 후보를 추천하지 않습니다."
- 모든 답변 하단 고정 푸터: "⚖ 최종 판단은 시민님께"
- 추천성 질문 ("누가 더 나아?", "누구 뽑을까?") 들어오면 봇이 자동 거절 + 비교 답변으로 우회

---

## 4. 관리자 페이지 (`district-avatar-admin.html`)

### 4.1 접근
- URL: `/district-avatar-admin.html`
- 인증: `X-Admin-Key` 헤더 (탐 단독 사용)
- 비공개 페이지, 메인 메뉴 노출 없음

### 4.2 기능 (Phase 1만)
- **선거구 검색**: 시도 → 시군구 → 선거구 (sggName) 트리 선택
- **ON/OFF 토글**: 해당 선거구의 통합 아바타 활성/비활성
- **아바타 자산 URL 입력**: 이미지 URL 1개 (탐이 별도 제공할 캐릭터 자산을 박음)
- **저장 버튼** → `PUT /district-config`
- **현재 활성 선거구 목록** (사이드바)

### 4.3 화면 구성
```
┌─────────────────────────────────────────────┐
│ 관리자: 통합 아바타 컨트롤                   │
├──────────────┬──────────────────────────────┤
│ 선거구 트리   │ 선택: 서울 > 종로구 > 종로갑 │
│ ─ 서울        │                              │
│   ─ 종로구    │ ON/OFF: [●━━━━] 활성        │
│     ─ 종로갑  │                              │
│     ─ 종로을  │ 아바타 이미지 URL:           │
│   ─ 중구      │ [_______________________]    │
│ ─ 부산        │                              │
│ ...           │ [미리보기]                   │
│               │                              │
│ 활성 (12개):  │ [저장]                       │
│ ─ 종로갑      │                              │
│ ─ 종로을      │                              │
│ ...           │                              │
└──────────────┴──────────────────────────────┘
```

### 4.4 Phase 2 자리 (UI 미리 잡아둠, 비활성)
- "FAQ 답변 관리" 탭 (Disabled, 회색)
- "가드레일 텍스트 편집" 탭 (Disabled)
- "대화 로그 검수" 탭 (Disabled)

---

## 5. 사합 백엔드 신규 API (3개)

### 5.1 `POST /api/v1/avatars/district-chat` — 시민용 통합 채팅

**Request**
```json
{
  "sgId": "string (NEC sgId)",
  "sgTypecode": "number (3=시장, 4=구청장, 5=시의원, 6=구의원, 11=교육감)",
  "sdName": "string (예: 서울특별시)",
  "sigunguName": "string (예: 종로구, optional)",
  "sggName": "string (선거구명, optional)",
  "question": "string (시민 질문)",
  "sessionId": "string (optional, 대화 연속성)"
}
```

**Response (200)**
```json
{
  "answer": "string (본문, 후보자명 인용 포함)",
  "citations": [
    {
      "candidateId": "uuid",
      "candidateName": "string",
      "pledgeId": "uuid?",
      "snippet": "string (인용된 공약 한두 줄)"
    }
  ],
  "scope": "directory | summary | compare | faq",
  "footer": "최종 판단은 시민님께",
  "sessionId": "string"
}
```

**내부 흐름**
1. `(sgId, sgTypecode, sdName, sigunguName)`로 후보자 목록 조회 (기존 `GET /candidates` 재사용)
2. 후보자별 `pledges[]` 수집 (기존 `PledgeKnowledgeService` RAG chunks 재사용)
3. RAG 컨텍스트 구성: 후보자명 + 공약 keyword/category/title/description
4. LLM 호출 (시스템 프롬프트에 가드레일 명시)
5. 응답 파싱 → citations 추출
6. (옵션) `/district-chat/log`에 비동기 기록

**시스템 프롬프트 가드레일**
```
당신은 {sggName} 선거구의 중립 안내봇입니다.
다음 규칙을 반드시 지킵니다:
- 특정 후보를 추천하거나 평가하지 않습니다.
- 당락을 예측하지 않습니다.
- 정당을 평가하지 않습니다.
- 공약을 인용할 때는 반드시 후보자명을 명시합니다.
- NEC 등록 공약만 사용합니다.
- 사용자가 추천을 요청하면 거절하고 비교 답변으로 대체합니다.
- 답변 본문 끝에는 항상 "최종 판단은 시민님께"를 붙입니다.
```

**전체 모드 처리 (주소지 미설정)**
- `sdName`만 들어오고 `sigunguName`/`sggName` 없으면 → **FAQ 모드**로 동작. 후보 정보 응답 X. 절차/날짜만.
- 사용자가 후보 질문하면: "내 동네를 먼저 설정해주세요" 응답.

---

### 5.2 `GET/PUT /api/v1/avatars/district-config` — 관리자 컨트롤

**GET**
```
GET /api/v1/avatars/district-config?sgId=&sigunguName=&sggName=
Headers: X-Admin-Key
```

**Response**
```json
{
  "sgId": "string",
  "sgTypecode": 6,
  "sdName": "string",
  "sigunguName": "string?",
  "sggName": "string?",
  "enabled": true,
  "assetImageUrl": "string?",
  "updatedAt": "ISO8601",
  "updatedBy": "string (admin key 식별자)"
}
```

**PUT**
```
PUT /api/v1/avatars/district-config
Headers: X-Admin-Key
Body: 위 Response 와 동일 구조
```

저장: `district_avatar_config` 테이블 (6절).

---

### 5.3 `POST /api/v1/avatars/district-chat/log` — 대화 로그 (Phase 2 검수 준비)

**Request**
```json
{
  "sessionId": "string",
  "sgId": "string",
  "sigunguName": "string?",
  "sggName": "string?",
  "question": "string",
  "answer": "string",
  "citations": [],
  "scope": "directory | summary | compare | faq",
  "createdAt": "ISO8601"
}
```

저장: `district_avatar_chat_log` 테이블 (6절). Phase 1에서는 단순 적재만, Phase 2에서 검수 UI 추가.

---

## 6. 데이터 모델 (신규 테이블 2개)

### 6.1 `district_avatar_config`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| sg_id | varchar | NEC sgId |
| sg_typecode | int | 3/4/5/6/11 등 |
| sd_name | varchar | 시도 |
| sigungu_name | varchar? | 시군구 (선거 종류별로 nullable) |
| sgg_name | varchar? | 선거구명 |
| enabled | boolean | ON/OFF |
| asset_image_url | varchar? | 아바타 이미지 URL |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| updated_by | varchar | admin key 식별자 |

Unique index: `(sg_id, sigungu_name, sgg_name)`

### 6.2 `district_avatar_chat_log`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| session_id | varchar | |
| config_id | uuid FK → district_avatar_config.id | |
| question | text | |
| answer | text | |
| citations | jsonb | |
| scope | varchar | directory/summary/compare/faq |
| created_at | timestamptz | |

⚠️ **쿼리 호환성** (메모리: `reference_ai_avatar_core_query_portability`):
- prod=PG, CI test=SQLite. `::cast` 금지 → `CAST(... AS ...)` 사용.
- 정렬 `NULLS LAST` 금지 → `CASE WHEN ... IS NULL THEN 1 ELSE 0 END` 버킷팅.

---

## 7. 카피 가이드 (메모리: `feedback_copy_guidelines` 준수)

### 사용
- "선거구 안내봇" / "공약 비교 도우미" / "{sggName} 안내봇"
- "NEC 등록 공약 기반"
- "최종 판단은 시민님께"

### 금지
- "AI 후보자" / "당선 보장" / "당락 예측" / "정당 평가"
- 후보자명 + "추천", "지지", "최고", "최선" 조합

---

## 8. 일정 (제안)

| D+ | 작업 | 담당 |
|---|---|---|
| D+0 (오늘) | 한국어 명세 작성 | 클로드_4 |
| D+1 | 한국어 명세 검수 + 영문 번역 (`district-avatar-spec.md`) | 탐 + 클로드_4 |
| D+1~3 | 시민용 페이지 mock 스캐폴딩 | 클로드_4 |
| D+1~3 | 관리자 페이지 mock 스캐폴딩 | 클로드_4 |
| D+2 | 사합 PR 본문 작성 (`ai-avatar-core` 레포) | 클로드_4 |
| D+3 | 사합에 PR 전달 | 탐 |
| D+5~6 | 사합 endpoint dev 머지 + 프론트 endpoint 연결 | 사합 + 클로드_4 |
| D+7 (~6/2) | 시연 가능 | |

---

## 9. 미해결 / 후속 검토
- 아바타 캐릭터 자산: 탐이 별도 제공 예정 (정지 이미지 1세트)
- 관리자 인증: `X-Admin-Key` 발급/회전 방식 사합 협의 필요
- 전체 모드의 FAQ 컨텐츠: 6/3 선거 일정 기준 5~10개 시드 질문 사합 PR 본문에 포함 예정
- Phase 2 분리 PR: FAQ CRUD / 가드레일 편집 / 검수 UI
