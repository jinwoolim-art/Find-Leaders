# 별이(가제) — Match 시스템 명세서

작성: 2026-05-28 · 작성자: 클로드_3-1 (탐님 인터뷰 기반, 탐님 위임 후 정석안 일괄 결정) · 구현 인계: 클로드_5 (Match 구현 담당, 신규 세션)
**2026-05-28 옵션 C update**: ASK Coach·Mediate 별도 프로젝트 폐기. 그 매커닉 (카드·xp·매개·draft) 은 이 명세 안으로 흡수. Match가 단일 메인 프로젝트.

inception: `Find-Leaders/docs/byeoli-match-inception.md`
상위 메모리: [[match-byeoli-inception]] [[ai-avatar-core-handover]] [[match-option-c-decision]]

---

## 1. 목표 (한 줄)

**AI 중재 양방향 성향 매칭 서비스** — 사용자가 안전하게·원할 때·조건 맞는 사람과 만나도록 AI 별이가 중재하는 소개팅 플랫폼.

---

## 2. Backstory (탐님 인터뷰 2026-05-28)

### 발견 흐름
1. 가족 §17 sub-session 중 *모임 매개* 통찰 → ASK Mediate 정체성 단체 매개로 확장
2. 도중 *사람과 사람 1:1 매칭* 컨셉 도출 → ASK 안 4번째 mode? 별도?
3. 일꾼·별·Mediate 자산 *양방향 매칭*에 적용 가능 발견 (75% 재사용)
4. 별 키우기 매커닉 *역방향* 응용: 사용자가 별이 키우는 게 아니라 **별이가 사용자 알아감**
5. 본질: 사용자는 *만나고 싶지만 부끄럽고·노출 X·안전·조건 맞춤* 원함. 별이가 *내 마음을 아니까* 다 말함 = 차별점.
6. ASK·일꾼과 분리. brand 가제 "별이". 백엔드 자산 공유 + 별도 brand·새 프론트
7. 시작 방식: 명세 + 법적 검토 병렬 (탐님 법적 자문 진행 중, 명세는 클로드 진행)
8. **2026-05-28 옵션 C 결정** — ASK Coach·Mediate 별도 프로젝트 폐기. 사업성 미검증 + Match 집중. 매커닉 자산 (카드·xp·LLM·매개·draft·시퀀스) 은 이 명세 안에서 *직접 명세화*. ASK Ask mode 만 별도 작은 프로젝트로 유지.

### 탐님 발언 원본 (핵심)
- "사용자는 별이가 안중요함. 사용하다보니 별이가 중요함"
- "누군가 만나고 싶지만 나서지는못하고 부끄럽고 노출되기싫어함. 안전하고싶고 이상한사람 만나기싫고. 내가 원할때 필요할때 만나고싶어. 서로 조건이 맞는사람과 만나고싶어"
- "별이가 그중재 잘해줌. 그래서 별이에게 다 말함. 왜? 별이는 내마음을 아니깐"
- "사용자가 비용을 지불하는 포인트를 잡는것도 중요"

### ASK 3-mode 정리 (2026-05-28 옵션 C 후)
- **Ask**: 1:1 자문 (전문가) — ASK 안 유지 (작은 별도 프로젝트)
- ~~**Coach**: 다대일 양육 (별이)~~ → **archive**. 매커닉만 Match 안 흡수
- ~~**Mediate**: 단체 매개 (그룹)~~ → **archive**. 매커닉만 Match 안 흡수
- **별이(Match)**: 양방향 1:1 매칭 — **메인 프로젝트** (별도 brand·서비스)

---

## 3. 핵심 매커닉 — 10 단계

```
1. 등록 + 나이·성향 입력 (10분)
   ↓
2. 호기심 단계 — 별이가 사용자 알아감 (Day 1-7)
   - 매일 카드 + 자유 텍스트
   - AI 아바타 5각 성향 차트 점점 완성
   - 사용자는 설레임 (락인 동력)
   ↓
3. 매칭 가능성 사람 나타남 (Day 7+)
   - 별이가 성향 일치도 분석
   ↓
4. 별이가 양쪽에 양방향 이슈 던짐
   - 두 사람 답변 → 일치도 측정
   ↓
5. 가장 가까운 매칭 우선순위 + 다수 풀 유지
   - 마지막까지 재시도 가능
   ↓
6. 양방향 수락 시 아바타 교환
   - 인사·짧은 자기소개 (사진 X)
   ↓
7. 1:1 대화 열림
   ↓
8. 별이가 대화 중재 + 장점 자동 소개
   - 이미 입력된 장점 자연스럽게 노출
   - 부드러운 분위기 (소개팅 자리)
   ↓
9. 만남 결정 + 조율 (장소·시간·비용·코스)
   - Mediate § 매개 매커닉 활용
   ↓
10. 두 사람 후기 별이가 중재
    - 양방향 피드백 정리
    - 다음 매칭 학습 → 별이가 더 잘 알아감
```

---

## 4. DB schema — `match_*` namespace

기존 일꾼 `candidate_*`·`citizen_*` 분리 → Match는 한 사용자가 양쪽 역할.

### 4.1 핵심 테이블

```sql
-- 1. match_user — 사용자 (candidate AND citizen 합체)
CREATE TABLE match_user (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    uuid NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  nickname        varchar(40) NOT NULL,
  birth_year      integer NOT NULL,
  gender          varchar(16),
  region_code     varchar(32),  -- 시도·시군구
  avatar_image_url text,        -- AI 아바타 (사진 X)
  profile_completion integer DEFAULT 0,  -- 0-100%
  match_purpose   varchar(32),  -- SERIOUS|CASUAL|HOBBY|MENTOR|COMPANION
  is_active       boolean NOT NULL DEFAULT true,
  founder_badge   boolean NOT NULL DEFAULT false,  -- 첫 1,000명 영구
  plan            varchar(16) NOT NULL DEFAULT 'FREE',  -- FREE|PRO|PRO_PLUS
  subscription_until timestamp,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_region_purpose ON match_user(region_code, match_purpose) WHERE is_active = true;
CREATE INDEX idx_user_plan_expiry ON match_user(plan, subscription_until);

-- 2. match_personality — 사용자 성향 5각 차트
CREATE TABLE match_personality (
  user_id        uuid PRIMARY KEY REFERENCES match_user(id) ON DELETE CASCADE,
  activity       integer NOT NULL DEFAULT 0,    -- 0-100
  thinking       integer NOT NULL DEFAULT 0,
  emotion        integer NOT NULL DEFAULT 0,
  adventure      integer NOT NULL DEFAULT 0,
  stability      integer NOT NULL DEFAULT 0,
  sociability    integer NOT NULL DEFAULT 0,  -- 6번째 축 (별 §17 5각 + sociability)
  updated_at     timestamp NOT NULL DEFAULT now()
);

-- 3. match_card_response — 사용자가 별이 카드에 답한 history
CREATE TABLE match_card_response (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  card_type   varchar(32) NOT NULL,   -- 'activity'|'thinking'|... or custom topic
  card_id     varchar(64) NOT NULL,   -- 특정 카드 ID
  raw_text    text,                   -- 사용자 자유 답변
  xp_gained   integer NOT NULL DEFAULT 5,  -- 별이가 알아가는 xp
  skill_deltas jsonb,                  -- {activity: 2, thinking: 1, ...}
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_response_user ON match_card_response(user_id, created_at DESC);

-- 4. match_byeoli_chat — 사용자-별이 1:1 대화
CREATE TABLE match_byeoli_chat (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  role        varchar(16) NOT NULL,    -- USER|BYEOLI
  text        text NOT NULL,
  context_summary text,                -- 별이의 사용자 인지 누적 요약
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_byeoli_chat_user_recent ON match_byeoli_chat(user_id, created_at DESC);

-- 5. match_user_xp — 별이가 사용자 알아가는 정도 (xp·level)
CREATE TABLE match_user_xp (
  user_id        uuid PRIMARY KEY REFERENCES match_user(id) ON DELETE CASCADE,
  xp_total       integer NOT NULL DEFAULT 0,
  level          integer NOT NULL DEFAULT 1,   -- 별이가 사용자 아는 정도
  matching_unlocked boolean NOT NULL DEFAULT false,  -- 매칭 임계 도달
  cards_completed integer NOT NULL DEFAULT 0,
  updated_at     timestamp NOT NULL DEFAULT now()
);

-- 6. match_pair_proposal — 매칭 후보 (별이가 추천)
CREATE TABLE match_pair_proposal (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id       uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  user_b_id       uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  similarity_score decimal(5,2) NOT NULL,  -- 0-100
  proposed_at     timestamp NOT NULL DEFAULT now(),
  user_a_seen     boolean NOT NULL DEFAULT false,
  user_b_seen     boolean NOT NULL DEFAULT false,
  user_a_response varchar(16),    -- PENDING|LIKED|PASSED
  user_b_response varchar(16),
  matched_at      timestamp,      -- 양방향 LIKED 시점
  expired_at      timestamp,      -- 72시간 만료
  UNIQUE (user_a_id, user_b_id)
);
CREATE INDEX idx_proposal_a_pending ON match_pair_proposal(user_a_id, user_a_response, proposed_at DESC) WHERE user_a_response = 'PENDING';
CREATE INDEX idx_proposal_b_pending ON match_pair_proposal(user_b_id, user_b_response, proposed_at DESC) WHERE user_b_response = 'PENDING';
CREATE INDEX idx_proposal_matched ON match_pair_proposal(matched_at) WHERE matched_at IS NOT NULL;

-- 7. match_issue_question — 양방향 이슈 (별이가 던지는 질문)
CREATE TABLE match_issue_question (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id     uuid NOT NULL REFERENCES match_pair_proposal(id) ON DELETE CASCADE,
  question_text   text NOT NULL,
  question_topic  varchar(32) NOT NULL,  -- 'values'|'lifestyle'|'crisis'|'future'|...
  user_a_answer   text,
  user_b_answer   text,
  similarity_score decimal(5,2),  -- 답변 일치도 (LLM 분석)
  asked_at        timestamp NOT NULL DEFAULT now(),
  user_a_answered_at timestamp,
  user_b_answered_at timestamp
);
CREATE INDEX idx_issue_proposal ON match_issue_question(proposal_id, asked_at DESC);

-- 8. match_conversation — 매칭 성사 후 1:1 대화 (별이 중재)
CREATE TABLE match_conversation (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id     uuid NOT NULL UNIQUE REFERENCES match_pair_proposal(id) ON DELETE CASCADE,
  user_a_id       uuid NOT NULL REFERENCES match_user(id),
  user_b_id       uuid NOT NULL REFERENCES match_user(id),
  started_at      timestamp NOT NULL DEFAULT now(),
  last_message_at timestamp NOT NULL DEFAULT now(),
  status          varchar(16) NOT NULL DEFAULT 'ACTIVE'  -- ACTIVE|MEETING_PLANNED|ENDED
);

CREATE TABLE match_conversation_msg (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES match_conversation(id) ON DELETE CASCADE,
  sender_user_id  uuid NOT NULL REFERENCES match_user(id),
  text            text NOT NULL,
  byeoli_mediation text,    -- 별이 중재 추가 (사용자 장점 노출·어색함 풀기)
  ai_attribution  text,     -- "AI 추측:" 라벨
  created_at      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_msg_recent ON match_conversation_msg(conversation_id, created_at DESC);

-- 9. match_meeting — 만남 조율 + 후기
CREATE TABLE match_meeting (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES match_conversation(id) ON DELETE CASCADE,
  planned_at      timestamp,
  planned_location text,
  planned_course  text,
  status          varchar(16) NOT NULL DEFAULT 'PLANNING',  -- PLANNING|CONFIRMED|COMPLETED|CANCELLED
  user_a_feedback text,
  user_b_feedback text,
  user_a_mood     varchar(16),  -- POSITIVE|NEUTRAL|NEGATIVE
  user_b_mood     varchar(16),
  byeoli_summary  text,         -- 별이가 양쪽 후기 정리
  completed_at    timestamp,
  created_at      timestamp NOT NULL DEFAULT now()
);

-- 10. match_subscription — 구독 결제
CREATE TABLE match_subscription (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  plan            varchar(16) NOT NULL,  -- PRO|PRO_PLUS
  amount_krw      integer NOT NULL,
  starts_at       timestamp NOT NULL,
  expires_at      timestamp NOT NULL,
  auto_renew      boolean NOT NULL DEFAULT true,
  pg_tx_id        varchar(120),  -- 포트원 transaction ID
  created_at      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_user_active ON match_subscription(user_id, expires_at DESC);

-- 11. match_boost — 일회성 부스트 결제
CREATE TABLE match_boost (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES match_user(id) ON DELETE CASCADE,
  boost_type      varchar(32) NOT NULL,  -- PRIORITY_24H|EXTRA_PROPOSALS|ANONYMOUS_LIKE|...
  amount_krw      integer NOT NULL,
  starts_at       timestamp NOT NULL DEFAULT now(),
  expires_at      timestamp,
  pg_tx_id        varchar(120)
);

-- 12. match_block_log — 차단·신고 history (안전)
CREATE TABLE match_block_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id uuid NOT NULL REFERENCES match_user(id),
  reported_user_id uuid NOT NULL REFERENCES match_user(id),
  reason          varchar(64) NOT NULL,
  detail          text,
  resolved_at     timestamp,
  resolution      text,
  created_at      timestamp NOT NULL DEFAULT now()
);
```

→ **13 테이블** (2026-05-28 정정 — match_conversation + match_conversation_msg 가 §8 블록 안에 묶여 있었음. 13개 모두 작성)

### 4.2 일꾼 자산 import (테이블 매핑)

| 일꾼 테이블 | Match 매핑 | 변경 |
|---|---|---|
| `user` | `auth.user` (공유) | 그대로 |
| `candidate` | `match_user` (양면 합체) | role 컬럼 추가 X, 사용자 1명이 양쪽 |
| `citizen` | `match_user` | 동일 |
| `candidate_policy` | `match_personality` + `match_card_response` | 정책 매칭 → 성향 매칭 |
| `citizen_pledge_reaction` | `match_pair_proposal` (LIKED·PASSED) | 응원 → 매칭 의향 |
| `chat_*` | `match_byeoli_chat` + `match_conversation_msg` | 그대로 |
| `payment_transaction` | `match_subscription` + `match_boost` | 그대로 |
| `district_*` | `region_code` 단순화 | 광역만 |

---

## 5. API endpoint — `/api/v1/match/*`

### 5.1 사용자 본인
```
POST   /match/onboard                 첫 가입 + 성향 입력
GET    /match/my-profile              내 프로필 + xp·level
PATCH  /match/my-profile              프로필 수정
PATCH  /match/my-personality          성향 차트 수동 수정 (옵션)
GET    /match/my-xp                   별이가 나 아는 정도
```

### 5.2 호기심 단계 (별이와 대화)
```
GET    /match/cards/today             오늘의 카드 (3-5개)
POST   /match/cards/:cardId/respond   카드 답변 (xp ↑)
GET    /match/byeoli/chat             별이와 1:1 대화 history
POST   /match/byeoli/chat             별이에게 자유 메시지
```

### 5.3 매칭
```
GET    /match/proposals               내 매칭 후보 list (PENDING)
GET    /match/proposals/:id           특정 후보 상세 (성향·답변 일부)
POST   /match/proposals/:id/respond   LIKED|PASSED
GET    /match/issues/:proposalId      양방향 이슈 list
POST   /match/issues/:questionId/answer  이슈 답변
GET    /match/matched                 성사된 매칭 list
```

### 5.4 대화 (매칭 성사 후)
```
GET    /match/conversation/:id        대화 히스토리
POST   /match/conversation/:id/msg    메시지 전송 (별이 중재 자동)
POST   /match/conversation/:id/end    대화 종료
```

### 5.5 만남
```
POST   /match/meeting                 만남 조율 시작
PATCH  /match/meeting/:id             일정·장소·코스 수정
POST   /match/meeting/:id/confirm     양방향 확정
POST   /match/meeting/:id/complete    만남 완료 + 후기
GET    /match/meeting/:id/byeoli-summary  별이 후기 정리
```

### 5.6 결제
```
GET    /match/plans                   plan 3종 정보
POST   /match/subscribe               Pro/Pro+ 구독 (포트원)
POST   /match/cancel-subscription     구독 취소
GET    /match/my-subscription         구독 상태
POST   /match/boost                   일회성 부스트 구매
GET    /match/founder-status          Founder 한정 잔여
```

### 5.7 안전·운영
```
POST   /match/report                  사용자 신고
POST   /match/block                   사용자 차단
GET    /match/my-reports              내 신고·차단 history
```

### 5.8 Realtime
```
WS     /realtime?matchUserId=...      매칭·메시지 알림
```

→ **31 endpoint + WebSocket**

---

## 6. Frontend 화면 흐름

### 6.1 라우트 (신규 레포 `byeoli-frontend` 또는 ASK 안 별도 mode)

```
app/
  onboard/
    step-1-info.tsx          # 가입 + 기본 정보
    step-2-purpose.tsx       # 매칭 목적 (진지·캐주얼·취미·멘토·동반자)
    step-3-personality.tsx   # 초기 성향 카드
    welcome.tsx              # 별이 첫 인사
  byeoli/
    index.tsx                # 메인 (별이 + 오늘의 카드)
    chat.tsx                 # 별이와 1:1 대화
    cards.tsx                # 카드 일괄 보기
  proposals/
    index.tsx                # 매칭 후보 list
    [id]/index.tsx           # 후보 상세
    [id]/issues.tsx          # 양방향 이슈
  matched/
    index.tsx                # 매칭 성사 list
    [id]/chat.tsx            # 1:1 대화 (별이 중재)
    [id]/meeting.tsx         # 만남 조율
    [id]/feedback.tsx        # 후기
  subscription/
    plans.tsx                # 결제 plan
    order/[orderId].tsx      # 결제 진행
  safety/
    report.tsx
    blocked.tsx
  profile/
    me.tsx                   # 내 프로필
    personality.tsx          # 내 성향 차트
    xp.tsx                   # 별이가 나 아는 정도
```

### 6.2 메인 화면 (별이 + 오늘의 카드)

```
┌─────────────────────────────────────────┐
│  ▼ 상단                                  │
│  안녕하세요, 지영씨                       │
│  별이 Lv.7 · 매칭 unlock 까지 12 xp 남음  │
├─────────────────────────────────────────┤
│                                         │
│         🌟 별이 (큰 아바타)              │
│         "지영씨, 오늘 어땠어요?"          │
│                                         │
│         성향 5각 차트                    │
│         activity 32 · thinking 45        │
│         emotion 28 · adventure 15        │
│         stability 38 · sociability 25    │
│                                         │
├─────────────────────────────────────────┤
│  📩 별이의 오늘 질문 (3개)               │
│  1. 주말에 갑자기 비가 오면?             │
│  2. 새로운 모임에 가면 어떤 모습?        │
│  3. 한 달 휴가가 생기면?                 │
│  [답하기 →]                              │
├─────────────────────────────────────────┤
│  💬 매칭 후보 (2명 도착)                 │
│  ┌──────────┐ ┌──────────┐              │
│  │ 익명 1   │ │ 익명 2   │              │
│  │ 78% 일치 │ │ 71% 일치 │              │
│  └──────────┘ └──────────┘              │
├─────────────────────────────────────────┤
│  하단 액션                                │
│  [💬 별이와 대화] [💕 매칭 보기] [📊 내 프로필] │
└─────────────────────────────────────────┘
```

### 6.3 매칭 후보 상세 (사진 X, 성향만)

```
┌─────────────────────────────────────────┐
│  📩 별이가 추천한 분                      │
│  78% 일치도                              │
├─────────────────────────────────────────┤
│  익명 후보                                │
│  - 32세 · 서울                            │
│  - 마케팅 직업                            │
│  - 매칭 목적: 진지한 만남                 │
│                                         │
│  성향 5각 차트 (당신 vs 후보)            │
│  [오버레이 차트]                          │
├─────────────────────────────────────────┤
│  📌 비슷한 답변                           │
│  - "주말 휴식 우선" (90% 일치)            │
│  - "갈등은 대화로" (85% 일치)             │
│                                         │
│  📌 다른 답변                             │
│  - 여행 스타일: 당신 자연파, 후보 도시파  │
├─────────────────────────────────────────┤
│  [✅ 좋아요] [✋ 다음에] [신고]          │
└─────────────────────────────────────────┘
```

### 6.4 매칭 성사 알림 (가장 강력한 결제 trigger)

```
┌─────────────────────────────────────────┐
│  🎉 매칭 성사!                            │
│                                         │
│  [화려한 풀스크린 애니메이션]            │
│  두 아바타가 서로 인사                   │
│                                         │
│  지영씨와 OOO씨가                        │
│  서로 좋아요를 보냈어요                  │
│                                         │
│  78% 성향 일치                           │
├─────────────────────────────────────────┤
│  💬 지금 1:1 대화 시작하려면              │
│  Pro가 필요해요                          │
│                                         │
│  ✨ 첫 달 50% 할인                       │
│  ₩9,900 → ₩4,900                       │
│                                         │
│  [Pro 시작하기]  [나중에]                │
└─────────────────────────────────────────┘
```

### 6.5 1:1 대화 화면 (별이 중재 자동)

```
┌─────────────────────────────────────────┐
│  💕 익명 후보와 대화                      │
│  별이가 도와드릴게요                     │
├─────────────────────────────────────────┤
│  지영씨: 안녕하세요!                     │
│                                         │
│  별이: 두 분 다 처음 대화시네요.         │
│        지영씨는 한강 산책 좋아하시고,   │
│        OOO씨는 카페 투어 좋아하세요.    │
│        공통점도 많아요 😊                 │
│  ─────────────────────────────────      │
│  OOO: 안녕하세요. 반가워요.              │
│                                         │
│  지영씨: 한강 좋아하신다고요?            │
│  별이: (어색함 풀기 자동)                │
│  ...                                    │
├─────────────────────────────────────────┤
│  [메시지 입력...]                        │
│  [📅 만남 제안] [🎁 별이 도움]           │
└─────────────────────────────────────────┘
```

---

## 7. 시드 데이터 (시연용)

```sql
-- 시드 사용자 6명 (시나리오 매핑)
INSERT INTO match_user (id, nickname, birth_year, gender, region_code, match_purpose, ...) VALUES
  ('00000001-...', '지영', 1992, 'F', 'KR-11', 'SERIOUS'),
  ('00000002-...', '민수', 1981, 'M', 'KR-11', 'COMPANION'),
  ('00000003-...', '도현', 1996, 'M', 'KR-11', 'HOBBY'),
  ('00000004-...', '영희', 1973, 'F', 'KR-26', 'COMPANION'),
  ('00000005-...', '유진', 1989, 'F', 'KR-OVERSEAS', 'SERIOUS'),
  ('00000006-...', '수민', 1986, 'F', 'KR-11', 'SERIOUS');

-- 시드 카드 60개 (성향 6축 × 10개씩)
INSERT INTO card_template (...) VALUES ...;

-- 시드 매칭 후보 (지영 ↔ OOO 78% 등)
INSERT INTO match_pair_proposal (...) VALUES ...;
```

---

## 8. UX 흐름 (Day 0 → Day 90)

(시나리오 6 참고 — 명세 §17.C 본문)

---

## 9. 수익 모델 — Plan 구조 + 자극 강화

(명세 §17.B.6 본문)

---

## 10. Cron job

| Job | 주기 | 동작 |
|---|---|---|
| `daily-cards-allocate` | 매일 00:00 | 사용자별 오늘의 카드 3-5개 할당 |
| `byeoli-context-summary` | 매시간 | 별이의 사용자 인지 누적 요약 갱신 (LLM) |
| `matching-engine` | 매시간 | 매칭 임계 도달 사용자 → 후보 매칭 |
| `proposal-expire` | 매시간 | 72시간 PENDING 후보 만료 |
| `subscription-renewal` | 매일 09:00 | Pro/Pro+ 자동 갱신 (포트원) |
| `subscription-expiry-warning` | 매일 18:00 | 만료 D-3 알림 |
| `boost-expire` | 매시간 | 일회성 부스트 정리 |
| `inactive-user-nudge` | 매주 토요일 | 7일+ 비활성 사용자 별이 안부 메시지 |
| `meeting-feedback-collect` | 만남 D+1 | 양쪽 후기 요청 + 별이 정리 |
| `safety-monitor` | 실시간 | 차단·신고 패턴 분석 |

→ **10 Cron**

---

## 11. 의존성 (2026-05-28 옵션 C 후 단순화)

| 영역 | 출처 | 상태 |
|---|---|---|
| NestJS backend | 일꾼 ai-avatar-core fork | ✅ 즉시 |
| OAuth (카카오·Apple) | 일꾼 [[apple-auth-added]] | ✅ 즉시 |
| 결제 (포트원) | 일꾼 [[pg-portone]] | ✅ 즉시 |
| AI 아바타 (LLM·voice) | 일꾼 ai-avatar-core | ✅ 즉시 |
| 매칭 알고리즘 (성향 벡터) | 일꾼 정책 매칭 응용 | ⚠️ refactor |
| 카드·xp·진화 | **Match 자체 구현** (§17.B.1·B.2 명세 직접) | 🆕 신규 |
| AI draft·중재 | **Match 자체 구현** (§17.B.4·B.5 명세 직접) | 🆕 신규 |
| RN 프론트 | 신규 (`byeoli-frontend`) | 🆕 신규 |
| 디자인 시스템 | ASK Tokens 일부 재사용 (Ask mode 부분만) | ⚠️ refactor |
| Push 알림 | FCM·APNs | 🆕 신규 |
| 19+ 인증 | NICE·PASS 통합 | 🆕 법적 자문 후 |

→ Coach·Mediate import 의존성 **제거**. Match 자체 명세 안에서 카드·xp·매개·draft·시퀀스 매커닉 모두 직접 명세화 (§17.B·D).

---

## 12. v1.0 vs v1.x 범위

### v1.0 (MVP — 출시 범위)
- 매칭 목적 5종 (진지·캐주얼·취미·멘토·동반자)
- 호기심 단계 카드 60개 + 자유 텍스트
- 매칭 풀 (성향 + 지역 + 목적 매칭)
- 양방향 이슈 (3-5 질문)
- 양방향 수락 → 아바타 교환 + 1:1 대화 (별이 중재)
- 만남 조율 (장소·시간·코스)
- 후기 중재 (별이 양방향 피드백 정리)
- 결제 plan 3종 (Free·Pro·Pro+) + In-app
- Founder 한정 (첫 1,000명)
- 안전 (신고·차단)

### v1.x (후속)
- 음성 입력 (STT, 노년 사용자 친절)
- 별이 음성 응답 (별 §17 사전 제작 음성 응용)
- 만남 코스 큐레이션 (Pro+ 고도화)
- 그룹 만남 (한 번에 2-3명 매칭)
- 매칭 후 만남 안전 SOS 기능
- 신원 인증 강화 (NICE 직장·학력)
- 글로벌 (외국 거주자) 매칭 풀

---

## 13. 위험 영역

### 13.1 법적 risk (탐님 영역 — 변호사 자문 진행 중)
- 정통 데이팅 앱 vs AI 중재 도구 분류 — 의무 차이
- 19+ 인증 의무화 범위
- 만남 후 사건 발생 시 플랫폼 책임 범위
- 매칭 알고리즘 차별 금지

### 13.2 운영 risk
- 매칭 풀 부족 (출시 초기 사용자 적음) — Founder marketing 푸시
- LLM 비용 폭증 (호기심 단계 무료 + 별이 대화 무제한)
- 악성 사용자 (사기·스토킹·성범죄) — 신고·차단·신원 인증

### 13.3 UX risk
- 호기심 단계 너무 길면 (xp 적립) 매칭 지연 → 사용자 이탈
- 별이 중재 너무 적극적 → 사용자 짜증
- 양방향 수락 비율 낮음 → 매칭 성사 ↓
- 매칭 후 만남 안 가는 *대화 종결* → Pro 갱신 ↓

---

## 14. 자산 활용 계획 (2026-05-28 옵션 C 후 단순화)

### 14.1 일꾼 ai-avatar-core fork (메인 자산)

```bash
git clone https://github.com/metarailix/ai-avatar-core byeoli-server
cd byeoli-server
git remote rename origin upstream
git remote add origin https://github.com/탐님/byeoli-server
git checkout -b match-mvp
git push -u origin match-mvp
```

Fork 후 변경:
- `candidate*` → `match_user` 양면 모델 (1 사용자가 양쪽 역할)
- `citizen*` → `match_user` (동일)
- `district*` → `region_code` 단순화 (광역만)
- `policy*` → `match_personality` + `match_card_response`
- `pledge*` → `match_issue_question` (양방향 이슈)
- `candidate_chat*` → `match_byeoli_chat` + `match_conversation_msg`
- 카카오·Apple OAuth 그대로
- 포트원 결제 그대로
- AI 아바타·LLM 그대로
- WebSocket realtime 그대로

→ **약 70% backbone 재사용**. namespace·도메인 어휘만 변경.

### 14.2 ASK Ask mode 의존성

- ASK 안내봇 funnel 일부 연계 (만남 코스 매칭 시) — 선택 (v1.x)
- ASK Tokens 디자인 시스템 부분 재사용 (color·spacing 등)
- ASK Coach·Mediate **archive** — 자산 import X (Match 안에 직접 명세됨)

### 14.3 신규 영역

- 호기심 단계 매커닉 (별이가 사용자 알아가는 역방향 흐름) — §17.B.1·B.2 명세
- 양방향 매칭 매커닉 (LIKED·PASSED·이슈) — §17.B.3
- 1:1 대화 + 별이 중재 — §17.B.4
- 만남 조율 + 후기 중재 — §17.B.5
- 결제 plan + Founder + In-app — §17.B.6
- LLM 3 prompt (카드 분석·이슈 생성·중재) — §17.D.2
- RN 프론트 (`byeoli-frontend`) — 신규 레포
- 19+ 인증 (NICE·PASS) — 법적 자문 후
- Push 알림 (FCM·APNs)
- 안전 (신고·차단)

---

## 15. PR / commit 가이드

브랜치: `byeoli-server` `byeoli-frontend` (2 레포)
target: `main`

PR description에 다음 포함:
- 일꾼·별·Mediate import 영역 명시
- DB schema diff
- 새 endpoint list
- 시각 검증 흐름 (가입 → 호기심 → 매칭 → 1:1 → 만남 → 후기 e2e)
- 법적 review 진행 상황 (탐님)

---

## 16. 후속 task

- **Task 04.1** — 음성 입력 (STT) + 별이 음성 응답
- **Task 04.2** — 만남 코스 큐레이션 (Pro+ 고도화)
- **Task 04.3** — 그룹 만남 (2-3명 매칭)
- **Task 04.4** — 글로벌 매칭 (외국 거주)
- **Task 04.5** — 만남 안전 SOS (위치·신고 즉시)

---

## 17. A·B·C·D Layer 명세 (정석안 일괄 결정 2026-05-28)

> §17.A·B·C·D 는 §1~§16 위에 fine-tune. 충돌 시 §17 우선. 클로드_5은 §17 먼저 읽고 §1~§16 세부 조정.

### 17.A — 의도/철학

#### 17.A.1 정체성

**별이(Match) = 양방향 성향 매칭 70% (메인) + 별이 마음 인지 30% (차별)**
**안전 = 전제 조건** (별도 축 X, 모든 매커닉 baked-in)

- **본질**: 사용자가 *원할 때·안전하게·조건 맞는 사람*과 매칭. 별이가 *내 마음을 아니까* 다 말함 → 별이가 잘 중재.
- **메인 메시지**: **"별이는 내 마음을 알아요"**
- **부 메시지**: "안전하게, 내가 원할 때, 조건 맞는 사람을"

**시간 흐름에 따른 사용자 인식**:
- Day 1: "매칭 앱이네"
- Day 7: "별이가 내 성향 물어보네"
- Day 30: "별이가 나를 좀 아네"
- Day 90: "별이한테는 다 말할 수 있어"
- Day 180: "별이 없으면 안 돼"

→ 별이 비중 *경험 의존 증가*. Day 0 = 매칭 앱, Day 90+ = "별이가 있는 매칭 앱".

**기각 후보**:
- AI 중재 100% — 매칭 본질 약함
- 호기심 100% — 별 §17 그대로 (방향 반대)
- 성향 매칭 100% — 글램·아만다 차별 약함
- 양방향 100% — 정서적 차별 빠짐

#### 17.A.2 1차 가치

**메인 = "이해받음·안심"**
부속: 안전·내가 원할 때·조건 맞춤·설레임

- **메인 메시지**: "별이는 내 마음을 알아요"
- 별 §17 = 자부심 (자랑 동력), Mediate § = 마음의 짐 해소 (직접 표현), **별이(Match) = 이해받음·안심** (정서적 깊이)

**Day별 가치 변화**:
- Day 0-7: 안심 (사진 X·안전·노출 X)
- Day 7-30: 설레임 (매칭 기대)
- Day 30-90: 이해받음 (별이가 내 마음 안다)
- Day 90+: 동반·우정 (별이는 친구 같음)

#### 17.A.3 북극성 우선순위

**A > B > C > D (strict)**

1. **A. 안전** (safety) — 사용자 신원 보호·노출 X·이상한 사람 X. 깎이면 매칭 자체 못 함.
2. **B. 매칭 정밀도** (match precision) — 성향·답변 일치도. 깎이면 매칭 의미 없음.
3. **C. 별이 인지 깊이** (byeoli understanding) — 사용자를 얼마나 잘 아는지. 깎이면 정서적 차별 약화.
4. **D. 만남 조율 매끄러움** (meeting facilitation) — 장소·시간·코스. 깎여도 매칭 핵심은 살아 있음.

**해석**: 안전이 절대 1순위. 매칭 정밀도가 가치의 본질. 별이 인지가 정서적 락인. 만남 조율은 양보 가능.

**별·Mediate 와 정렬**:
- 별 §17: A 기여 > B 인격 > D 분배 > C 데뷔 (양육 정서)
- Mediate §17: A 진정성 > B 안정감 > C 정밀도 > D 흐름 (신뢰 인프라)
- 별이(Match): A 안전 > B 매칭 > C 인지 > D 조율 (안전 인프라)

---

### 17.B — 매커닉

#### 17.B.1 호기심 단계 — 별이가 사용자 알아감

**핵심**: Tamagotchi 양육 매커닉의 **역방향 응용** — *사용자가 AI 캐릭터를 키우는 게 아니라* **AI 캐릭터(별이) 가 사용자를 알아간다**. 카드·xp·진화 게이트 매커닉으로 별이의 사용자 인지가 점점 깊어짐.

**매커닉**:

```
xp 곡선:
Lv.1-3   (탐색):     레벨당 30 xp   → 30 카드 답변 → 매칭 unlock 임계
Lv.4-7   (이해):     레벨당 50 xp   → 별이가 성향 5각 차트 정밀화
Lv.8-15  (친밀):     레벨당 100 xp  → 별이 personalized prompt 시작
Lv.16-30 (깊은 이해): 레벨당 200 xp → 별이가 사용자 마음 깊이 추측 ("AI 추측:" 라벨)
Lv.31+   (동반자):    레벨당 500 xp → 별이 음성 응답 (Pro+ v1.x)
```

**카드 종류 (6 축 × 10 카드 = 60 카드)**:
- **activity** (활동성): 주말·여가·운동
- **thinking** (사고형): 의사 결정·논리·계획
- **emotion** (감성): 공감·표현·감정 처리
- **adventure** (모험): 새로운 시도·여행
- **stability** (안정): 일상·루틴·미래 계획
- **sociability** (사회성): 사람 만남·모임·네트워크

각 카드 = (질문 + 자유 텍스트 답변 또는 선택지). LLM 분석 → 성향 5각 차트 업데이트.

**진화 게이트**:
- **Lv.3 (매칭 unlock)**: 30 카드 답변 + 6 축 모두 최소 10 → 매칭 후보 노출 시작
- **Lv.7 (양방향 이슈)**: 60 카드 + 6 축 모두 30 → 양방향 이슈 풀 다양해짐
- **Lv.15 (정밀 매칭)**: Pro 사용자만 unlock → 우선 매칭 + 별이 personalized

**별이 응답 형식**:
- 카드 단계 (Lv.1-3): 사전 정의 응답 풀 5-10개 × 60 카드 = 300-600 응답
- Lv.4+ 진화: 별이 LLM 응답 (사용자 컨텍스트 + 누적 인지)
- placeholder: `{nickname}` `{recent_topic}` `{level}` `{top_axis}`

#### 17.B.2 성향 입력 방식 — 카드 + 자유 텍스트

**3 단계 진화 (사용자 Lv에 따라 입력 방식 unlock)**:

1. **초보 (Lv.1-3)**: 시스템 카드 (선택지 + 짧은 텍스트)
2. **숙련 (Lv.4-7)**: 카드 + 자유 텍스트 (별이 LLM 분석)
3. **정상 (Lv.8+)**: 자유 채팅 (별이가 의도·성향 자동 추출)

**카드 종류 → 5각 매핑**:
- activity 카드 → activity +5 xp
- thinking 카드 → thinking +5 xp
- 자유 텍스트 (Lv.4+) → LLM 분석 후 적절한 축에 +2-8 xp

**오늘의 카드 노출 cron**:
- 매일 00:00 카드 3-5개 자동 할당
- 사용자가 약한 축 우선 (5각 균형 유도)
- 7일 연속 출석 시 보너스 카드 (특별 질문)

#### 17.B.3 매칭 알고리즘 + 양방향 이슈

**매칭 후보 검색 (cron `matching-engine`)**:

```python
for user_a in matching_unlocked_users:
    candidates = match_user.query(
        gender_preference=user_a.preference,
        age_range=user_a.preference.age,
        region=user_a.region,
        match_purpose=user_a.match_purpose,
        is_active=True,
        not_blocked=True
    )
    
    for user_b in candidates:
        similarity = cosine_similarity(user_a.personality, user_b.personality)
        if similarity >= 0.6:
            create_pair_proposal(user_a, user_b, similarity)
```

**양방향 이슈 생성 (LLM)**:

매칭 후보 PENDING 상태 → 별이가 3-5 질문 생성:
- 두 사람 성향 분석 → *대조 가능한 질문* 자동 생성
- 예: 둘 다 activity 높음 → "갑자기 일정 비면?" "주말 즐겨 가는 곳?"
- 답변 후 → LLM 일치도 분석 (0-100%)

**매칭 일치도 score (최종)**:
```
final_score = personality_similarity × 0.5
            + issue_answer_similarity × 0.4
            + purpose_match × 0.1
```

#### 17.B.4 아바타 교환 + 1:1 대화 + 별이 중재

**양방향 수락 흐름 (Day 17 매칭 성사)**:

```
1. 사용자 A → LIKED → 후보 B에게 알림 (익명)
2. 후보 B → LIKED → 양방향 매칭!
3. match_pair_proposal.matched_at 갱신
4. 두 사람 아바타·기본 정보 공개 (성향 차트·매칭 목적·지역)
5. 1:1 대화 unlock (Pro 필요 — 가장 강한 결제 trigger)
```

**별이 중재 매커닉 (대화 자동 보강)**:

매 메시지 전송 시 LLM 분석:
- 어색함 감지 → 별이가 *공통점* 자동 노출 ("두 분 다 한강 좋아하시네요")
- 갈등 감지 → 별이가 *완충 메시지* 자동 삽입 ("OOO씨도 비슷한 경험 있으세요")
- 침묵 감지 (24시간 응답 X) → 별이가 *대화 주제* 제안

**장점 자동 노출**:
- 사용자 등록 시 입력한 장점·매력 포인트 → 별이가 자연스럽게 대화에 끼움
- 예: 지영씨가 "꾸준한 운동 습관" 입력 → 별이가 "지영씨, 매일 운동하시는 분이세요" 자연 노출
- 사용자 자기 자랑 부담 ↓

#### 17.B.5 만남 조율 — AI 매개 매커닉

**만남 조율 7 단계** (AI draft 확인·매개 큐 매커닉):

```
1. 양방향 매칭 후 1:1 대화 진행
   ↓
2. 한 사람 [📅 만남 제안] 누름
   ↓
3. 별이가 양쪽에 일정·장소·코스 옵션 제시
   - 둘 다 좋아하는 활동 기반
   - 지역 중간 지점
   - 예산 합의 (양쪽 옵션)
   ↓
4. 양쪽 선택·조율 (별이 매개)
   ↓
5. 양방향 확정 → match_meeting.status = CONFIRMED
   ↓
6. 만남 D-day
   - 만남 전: 별이가 양쪽 인사 메시지
   - 만남 후: 별이가 후기 요청
   ↓
7. 후기 중재 (B.6)
```

**Pro+ 만남 큐레이션 (옵션)**:
- 별이가 코스 5개 추천 (양쪽 취향 + 지역 + 예산)
- 식당·카페·액티비티 예약 link 자동 (ASK 안내봇 funnel 연결)
- 매칭 수수료 5-10% 수익

#### 17.B.6 결제 모델 — 시나리오 결제 포인트

**Plan 구조**:

| Plan | 가격 | 핵심 unlock |
|---|---|---|
| **무료** | ₩0 | 호기심 단계 무한 + 매칭 후보 월 3명 노출 |
| **Pro** | ₩9,900/월 | 매칭 후보 무제한 + 양방향 이슈 답변 + **매칭 후 1:1 대화** |
| **Pro+** | ₩19,900/월 | Pro + 별이 만남 큐레이션 + 우선 매칭 + 고급 성향 분석 |
| **In-app** | ₩1,000-9,900 | 아바타 의상·시즌 카드·부스트 |

**가장 강한 결제 trigger = Day 17 매칭 성사**:

매칭 성사 알림 풀스크린 시퀀스 → "1:1 대화 시작" CTA → Pro 모달 → 첫 달 50% 할인 (₩4,900) → 결제 conversion 최고.

**Founder 한정 (출시 첫 1,000명)**:
- 평생 Pro 50% 할인 (₩4,900/월 영구)
- 'Founder' 영구 배지 (아바타에 표시)
- 신규 기능 사전 이용권
- 출시 marketing 푸시

**부스트 일회성**:
- 🚀 우선 매칭 (24h): ₩4,900
- 🎯 매칭 추가 (5명): ₩2,900
- 💝 익명 좋아요 (3회): ₩1,900
- ⏰ 응답 알림 (1주): ₩2,900

**시즌 이벤트**:
- 발렌타인: 특별 "고백" 카드 ₩4,900
- 봄·여름·가을·겨울 시즌 아바타 의상 ₩2,900-9,900

**매출 시뮬레이션 (가입자 100,000 가정, 보수적 30% 전환)**:
- Pro 30,000명 × ₩9,900 = ₩297,000,000/월
- Pro+ 10,000명 × ₩19,900 = ₩199,000,000/월
- In-app 평균 ₩2,000 × 40,000 = ₩80,000,000/월
- **합 월 ₩576M = 연 ₩69억** (보수안)
- 낙관 (50% 전환) = 연 ₩124억

**락인 vs 결제 분리**:
- 락인 = 무료 (별이 대화·매일 카드·후기 중재)
- 결제 = 진행 단계 (매칭·1:1·만남)
- 사용자 부담 ↓ + 정통 데이팅 앱 인상 회피

---

### 17.C — UX 흐름

#### 17.C.1 첫 진입 + 메인 화면

**Onboarding 3 step** (Day 0):
1. 가입 + 기본 정보 (10분 안에)
2. 매칭 목적 선택 (5종: 진지·캐주얼·취미·멘토·동반자)
3. 초기 성향 카드 5개 (5각 기본 측정)
4. 별이 첫 인사 (welcome 화면)

**메인 화면** (Day 1+):
- 상단: 별이 + Lv·xp
- 중앙: 별이 큰 아바타 + 5각 성향 차트
- 카드 영역: 오늘의 질문 3-5개
- 매칭 영역: 매칭 후보 list (Lv.3+ unlock)
- 하단: [💬 별이 대화] [💕 매칭 보기] [📊 내 프로필]

#### 17.C.2 호기심 단계 UX (Day 1-7)

**매일 진입 → 카드 답변 → xp ↑**:

```
1. 메인 진입 → "오늘의 별이 질문" 3개 카드
2. 카드 누름 → 질문 + 답변 입력 (선택지 또는 자유 텍스트)
3. 답변 후:
   - +5 xp 토스트
   - 성향 5각 차트 해당 축 +N (애니메이션)
   - 별이 응답 (사전 정의 풀 + 코치 이름 호명)
4. 3개 카드 완료 → "오늘 끝!" 격려 + 내일 안내
5. Lv up 시 → 풀스크린 축하 + 별이 인사 변화
```

**별이 1:1 대화** (Lv.4+ unlock):
- 자유 채팅
- 별이가 누적 인지로 응답 ("어제 말씀하신 OO, 오늘은 어떠세요?")
- 별이 personalized prompt (Lv.15+ Pro+)

#### 17.C.3 매칭 UX (Day 7+)

**매칭 후보 노출** (Lv.3 unlock):
- 메인 화면 "💬 매칭 후보 (N명 도착)" 영역
- 후보 카드: 익명·나이·지역·일치도%
- 누르면 상세 (성향 차트 오버레이·비슷한/다른 답변)

**좋아요·다음에**:
- [✅ 좋아요] 누름 → 후보에게 익명 알림
- [✋ 다음에] 누름 → PASSED 처리
- 무료: 월 매칭 후보 3명 한도
- Pro: 무제한

**양방향 이슈** (한 쪽 LIKED 후 또는 별이 자동):
- 별이가 3-5 질문 던짐
- 답변 후 → 일치도 % 노출 (Pro 결제 후)

**매칭 성사 (양방향 LIKED)**:
- 풀스크린 시퀀스 (애니메이션 + 두 아바타 인사)
- "지금 1:1 대화 시작" CTA → **Pro 결제 모달**
- 첫 달 50% 할인 강조 (Founder는 평생 할인)

#### 17.C.4 1:1 대화·만남·후기 UX

**1:1 대화 화면** (Pro 결제 후):
- 채팅 인터페이스 (메시지 + 별이 중재 메시지 inline)
- 별이가 어색함 풀어줌·공통점 노출·장점 자동 소개
- [📅 만남 제안] [🎁 별이 도움] 액션

**만남 조율 흐름**:
- [만남 제안] → 일정·장소·코스 옵션 선택
- 양쪽 조율 (별이 매개)
- 양방향 확정 → 만남 D-day 자동 알림

**만남 후 후기 중재** (Day +1):
- 별이가 양쪽에 "오늘 어떠셨어요?" 물음
- 양쪽 답변 → 별이가 정리:
  - "두 분 다 편안하셨다고 하셨어요"
  - "OOO씨가 다음에도 만나고 싶어하세요"
  - "지영씨는 좀 더 시간이 필요하다고 하셨어요"
- 양쪽 후기 *원문 노출 X* — 별이 정리만

---

### 17.D — 기술 구현 명세 (클로드_5 영역)

> §17.D는 클로드_5 (Match 구현 담당, 신규 세션) 가 받아 즉시 시작 가능한 spec. §1~§16 + §17.A·B·C 결정 + §17.D 매핑 종합.

#### 17.D.1 DB schema

(§4 본문 참고 — 13 테이블)

핵심 차이:
- 일꾼 `candidate`+`citizen` 분리 → `match_user` 합체 (양면)
- 일꾼 `policy` → `match_personality` + `match_card_response`
- 별 §17 `trainee_user_*` → `match_user_xp`
- Mediate § `mediation_chat_msg` → `match_byeoli_chat` + `match_conversation_msg`

#### 17.D.2 API + LLM prompt + Cron

(§5 + §10 본문 참고)

**LLM Prompt 3개** (Claude Haiku 4.5):

```
[Prompt 1: 카드 답변 → 성향 분석]
입력: 카드 ID, 사용자 답변
출력 (JSON):
{
  "axis_deltas": { "activity": +5, "thinking": +2, ... },
  "context_phrase": "사용자가 휴식 우선 성향임을 보여줌",
  "follow_up_suggestion": "다음 카드 추천 ID"
}
```

```
[Prompt 2: 양방향 이슈 생성]
입력: 사용자 A·B 성향 + 누적 인지
출력 (JSON):
{
  "questions": [
    { "topic": "values", "text": "...", "expected_divergence": "low" },
    ...
  ]
}
```

```
[Prompt 3: 별이 중재 메시지 (1:1 대화)]
입력: 대화 history + 양쪽 성향·장점·매칭 컨텍스트
출력 (JSON):
{
  "should_intervene": true,
  "mediation_text": "두 분 다 한강 좋아하시네요...",
  "attribution": null  // 추측이면 "AI 추측: ..."
}
```

**LLM 비용 추정**:
- 카드 답변당 1 LLM 호출 ≈ $0.0005
- 양방향 이슈 생성 1회 (proposal당) ≈ $0.002
- 1:1 대화 중재 메시지당 1 호출 (10% 빈도) ≈ $0.0001
- 사용자당 월 30 카드 + 5 proposal + 50 대화 메시지 = $0.04/월/사용자
- 100,000 사용자 = $4,000/월 = ₩5.4M/월

#### 17.D.3 컴포넌트·라이브러리

**RN 컴포넌트** (~28개):

```
[온보딩 — 4]
OnboardStep1Info, OnboardStep2Purpose, OnboardStep3Personality, ByeoliWelcome

[메인 — 5]
ByeoliMainHero, PersonalityRadarChart, TodayCardGrid, MatchProposalsSummary, BottomNav

[카드 — 4]
CardQuestion, CardAnswerInput, CardResponseToast, XpLevelBadge

[별이 대화 — 3]
ByeoliChatBubble, ByeoliChatInput, ByeoliContextSummary

[매칭 — 5]
ProposalCard, ProposalDetailView, PersonalityOverlayChart, IssueQuestionCard, MatchSuccessSequence

[1:1 대화 — 4]
ConversationBubble, ByeoliMediationInline, MeetingProposeButton, ConversationHeader

[만남 — 3]
MeetingPlannerModal, MeetingConfirmCard, MeetingFeedbackCard

[결제 — 4]
PlanComparisonCard, FounderBadge, BoostStore, SubscriptionStatus

[안전 — 2]
ReportModal, BlockButton
```

**라이브러리 hooks** (~20):

```
api.ts, realtime.ts, responsePool.ts, mediationPrompt.ts

[온보딩·프로필]
useOnboarding, useMyProfile, useMyPersonality, useMyXp

[카드]
useTodayCards, useCardResponse, useByeoliChat

[매칭]
useProposals, useProposal, useIssueQuestions, useMatchedList, useMatchSuccessAnimation

[대화·만남]
useConversation, useMeeting, useMeetingFeedback

[결제]
usePlans, useSubscription, useFounderStatus, useBoosts, usePortone

[안전]
useReports, useBlocks
```

#### 17.D.4 클로드_5 인계 우선순위 (Roadmap)

**Phase 1 — DB + API 인프라 (1.5주)**:
- 일꾼 ai-avatar-core fork (`byeoli-server`)
- `match_*` 13 테이블 migration
- 사용자·프로필·카드 endpoint 기본
- 별 §17 카드·xp 시스템 import (클로드_4 협조)
- LLM prompt 3개 통합 (Haiku 4.5)
- OAuth (카카오·Apple) 그대로

**Phase 2 — 호기심 단계 UX (1주)**:
- 신규 프론트 레포 (`byeoli-frontend`)
- 온보딩 3 step
- 메인 화면 + 카드 답변 흐름
- 별이 1:1 대화
- xp·level 시스템

**Phase 3 — 매칭 + 양방향 이슈 (1.5주)**:
- 매칭 engine cron
- 매칭 후보 노출·좋아요·다음에
- 양방향 이슈 생성·답변
- 매칭 성사 시퀀스 (Pro 결제 trigger)
- 일꾼 정책 매칭 알고리즘 응용

**Phase 4 — 1:1 대화 + 만남 + 후기 (1.5주)**:
- 1:1 대화 (별이 중재 자동)
- Mediate §17 매개 매커닉 import (클로드_5 협조)
- 만남 조율 (장소·시간·코스)
- 후기 중재
- ASK 안내봇 funnel 연결 (만남 코스 매칭)

**Phase 5 — 결제 + 안전 + 운영 (1주)**:
- 결제 plan 3종 (포트원)
- Founder 한정 marketing
- 부스트 + In-app
- 신고·차단·안전 모니터
- 운영 dashboard

**Phase 6 — v1.x (출시 후)**:
- 음성 입력 (STT)
- 별이 음성 응답
- 만남 코스 큐레이션 고도화
- 그룹 만남
- 글로벌 매칭

**총 추정**: 6.5주 (Phase 1-5) + v1.x 별도

---

## 18. 시각 차별점 (ASK Ask vs 별이 Match)

| 영역 | ASK Ask | **별이 (Match)** |
|---|---|---|
| 관계 | 사용자 ↔ 전문가 | **사용자 ↔ AI ↔ 새 사용자** |
| AI 역할 | 옆 보조 | **자리 운영자·중재자** |
| 사용자 입장 | 고객 | **고객 → 친구 (정서)** |
| 락인 | 신뢰·전문성 | **이해받음·안심** |
| 수익 | 매칭 수수료·광고 | **개인 구독 + Founder + In-app** |
| UX | 검색·상세·챗 | **AI 중재 소개팅** |
| 차별 strategy | 전문가 신뢰 | **AI 별이 + 안전** |

→ ASK Coach·Mediate 는 **archive** (옵션 C 2026-05-28). 매커닉만 Match 안 흡수.

---

## 19. 결정 history

| 일자 | 결정 | 출처 |
|---|---|---|
| 2026-05-28 | brand 가제 "별이". 백엔드 공유·프론트 분리 | 클로드_3-1 세션 |
| 2026-05-28 | 정체성: 양방향 성향 매칭 70% + 별이 마음 인지 30% | 탐님 (사용자 needs 본질) |
| 2026-05-28 | 1차 가치: "이해받음·안심" | 시나리오 6 검증 |
| 2026-05-28 | 북극성: A 안전 > B 매칭 정밀도 > C 별이 인지 > D 만남 조율 | 정석안 (안전 baked-in) |
| 2026-05-28 | Plan: 무료·Pro ₩9,900·Pro+ ₩19,900 + In-app + Founder | 탐님 결제 포인트 결정 |
| 2026-05-28 | 가장 강한 결제 trigger: Day 17 매칭 성사 | 정석안 (별 §17 데뷔 D-day 응용) |
| 2026-05-28 | 명세 작성 후 구현 클로드_5 인계 | 탐님 위임 |

---

## 20. 다음 단계 (2026-05-28 옵션 C 후)

- [ ] 탐님: 변호사 자문 (인증·약관·정통 데이팅 앱 분류)
- [ ] 클로드_5 (신규 세션): Phase 1 시작 — 일꾼 fork + DB migration
- [ ] ~~클로드_4 협조~~ → Coach archive. 매커닉 Match 안에 직접 명세됨
- [ ] ~~클로드_5 협조~~ → Mediate archive. 매커닉 Match 안에 직접 명세됨
- [ ] 브랜드 명 확정 (별이 가제 → 실제 brand)
- [ ] 디자인 작업 (별이 아바타·UI 디자인 시스템)
- [ ] 출시 marketing 준비 (Founder 1,000명 푸시)
