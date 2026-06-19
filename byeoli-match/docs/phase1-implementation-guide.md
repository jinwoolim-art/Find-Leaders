# 별이(Match) Phase 1 구현 가이드 — 클로드_5 인계

작성: 2026-05-28 · 작성자: 클로드_3-1 · 인계 대상: 클로드_5 (Match 구현 담당, 신규 세션)

이 문서는 **Phase 1 (1.5주)** 시작 시 그대로 적용 가능한 *step-by-step* 작업 list. 단순 명세가 아니라 *실행 가능한 명령·코드·체크리스트*.

상위 명세: `byeoli-match/docs/spec.md`
inception: `Find-Leaders/docs/byeoli-match-inception.md`

---

## Phase 1 작업 list (1.5주, 5 step)

### Step 1 — 일꾼 ai-avatar-core fork (Day 1)

```bash
# 1. 일꾼 backbone fork
git clone https://github.com/metarailix/ai-avatar-core ~/Documents/GitHub/byeoli-server
cd ~/Documents/GitHub/byeoli-server

# 2. remote 재정렬
git remote rename origin upstream
# (탐님 GitHub에 byeoli-server 레포 생성 후)
git remote add origin https://github.com/탐님계정/byeoli-server.git

# 3. main branch 새로 시작
git checkout -b match-mvp
git push -u origin match-mvp
```

**Checkpoint**:
- [ ] byeoli-server 레포 생성됨
- [ ] match-mvp 브랜치 push됨
- [ ] 일꾼 코드 100% 인계 확인 (서버 실행해서 Swagger 노출 OK)

---

### Step 2 — `match_*` 13 테이블 migration (Day 2-3)

**파일**: `byeoli-server/src/migrations/1735000000-CreateMatchTables.ts`

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMatchTables1735000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. match_user
    await queryRunner.query(`
      CREATE TABLE match_user (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        auth_user_id uuid NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        nickname varchar(40) NOT NULL,
        birth_year integer NOT NULL,
        gender varchar(16),
        region_code varchar(32),
        avatar_image_url text,
        profile_completion integer DEFAULT 0,
        match_purpose varchar(32),
        is_active boolean NOT NULL DEFAULT true,
        founder_badge boolean NOT NULL DEFAULT false,
        plan varchar(16) NOT NULL DEFAULT 'FREE',
        subscription_until timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_user_region_purpose ON match_user(region_code, match_purpose) WHERE is_active = true;
      CREATE INDEX idx_user_plan_expiry ON match_user(plan, subscription_until);
    `);

    // 2. match_personality
    // 3. match_card_response
    // ... (spec §4.1 의 13 테이블 모두)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS match_block_log CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS match_boost CASCADE;`);
    // ... 역순으로 모두 DROP
  }
}
```

**Checkpoint**:
- [ ] 13 테이블 migration 작성 완료
- [ ] 로컬 DB에서 `npm run migration:run` 성공
- [ ] `psql` 또는 pgAdmin에서 테이블 12개 확인
- [ ] `npm run migration:revert` 도 성공 (rollback 검증)

---

### Step 3 — 사용자·프로필 endpoint 기본 (Day 4-5)

**파일들**:
```
byeoli-server/src/match-user/
  match-user.module.ts
  match-user.controller.ts
  match-user.service.ts
  match-user.entity.ts
  dto/
    onboard.dto.ts
    update-profile.dto.ts
    response.dto.ts
```

**핵심 endpoint** (spec §5.1 참고):
```typescript
@Controller('api/v1/match')
export class MatchUserController {
  @Post('onboard')
  async onboard(@Body() dto: OnboardDto, @Req() req): Promise<MatchUserResponseDto> {
    // 1. auth_user_id 확인 (인증)
    // 2. match_user 생성
    // 3. match_personality 초기 5각 차트 생성 (모두 0)
    // 4. match_user_xp 초기 (Lv.1, xp 0)
    // 5. Founder 한정 체크 (첫 1,000명 → founder_badge true)
  }
  
  @Get('my-profile')
  async getMyProfile(@Req() req): Promise<MatchUserResponseDto> { ... }
  
  @Patch('my-profile')
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req) { ... }
  
  @Get('my-xp')
  async getMyXp(@Req() req): Promise<MatchUserXpResponseDto> { ... }
}
```

**Checkpoint**:
- [ ] Swagger `/api/docs` 에서 endpoint 4개 노출
- [ ] Postman/curl 로 onboard → my-profile 흐름 검증
- [ ] Founder badge 첫 1,000명 자동 부여 검증

---

### Step 4 — 별 §17 카드·xp 시스템 import (Day 6-8)

**클로드_4 협조 필요** (별 §17 코드 import 조율). 작업:

1. **카드 메타 JSON 작성** (`byeoli-server/data/cards/card-set.json`):
   - 60 카드 (6 축 × 10 카드)
   - 각 카드: id·axis·question·answer_options 또는 free_text·xp_per_axis
   - 예:
```json
{
  "card_activity_01": {
    "axis": "activity",
    "question": "주말에 갑자기 비가 오면 보통 어떻게 하세요?",
    "answer_type": "select_or_free",
    "options": [
      { "id": "a1", "text": "집에서 영화·책", "deltas": { "stability": +3 } },
      { "id": "a2", "text": "카페·실내 활동", "deltas": { "sociability": +3 } },
      { "id": "a3", "text": "운동·헬스장", "deltas": { "activity": +5 } },
      { "id": "a4", "text": "친구·가족 만남", "deltas": { "sociability": +5, "emotion": +2 } }
    ],
    "free_text_prompt": "또는 자유롭게 적어주세요",
    "xp_base": 5
  },
  ...
}
```

2. **별이 응답 풀 작성** (`byeoli-server/data/byeoli/response-pool.json`):
   - 카드 종류별 사전 정의 응답 5-10개
   - placeholder: `{nickname}` `{xp_gained}` `{level}` `{top_axis}`

3. **endpoint** (spec §5.2):
```
GET    /match/cards/today
POST   /match/cards/:cardId/respond
GET    /match/byeoli/chat
POST   /match/byeoli/chat
```

**Checkpoint**:
- [ ] 60 카드 메타 JSON 완성
- [ ] 별이 응답 풀 300+ 응답 작성
- [ ] 오늘의 카드 cron (`daily-cards-allocate`) 실행 검증
- [ ] 카드 답변 → xp ↑ + 성향 차트 update 검증
- [ ] Lv up 시점 매칭 unlock 검증 (Lv.3)

---

### Step 5 — LLM prompt 3개 통합 (Claude Haiku 4.5) (Day 9-10)

**파일**: `byeoli-server/src/llm/byeoli-prompts.ts`

```typescript
export const BYEOLI_PROMPTS = {
  // Prompt 1: 카드 답변 → 성향 분석
  cardResponseAnalysis: `당신은 사용자의 성향을 분석하는 AI입니다.

입력:
- 카드: {card_id} (축: {card_axis})
- 사용자 답변: "{user_text}"
- 사용자 현재 성향: {personality_json}

출력 (JSON only):
{
  "axis_deltas": { "activity": +5, ... },
  "context_phrase": "사용자가 ___ 성향임",
  "follow_up_suggestion": "card_id"
}`,

  // Prompt 2: 양방향 이슈 생성
  issueGeneration: `매칭 후보 두 사람에게 던질 양방향 이슈 3-5개 생성.

사용자 A 성향: {user_a_personality}
사용자 B 성향: {user_b_personality}
일치도: {similarity}%

목적: 두 사람 가치관·생활 패턴·갈등 대응 등 비교.

출력 (JSON only):
{
  "questions": [
    { "topic": "values", "text": "...", "expected_divergence": "low" },
    ...
  ]
}`,

  // Prompt 3: 별이 중재 (1:1 대화)
  conversationMediation: `1:1 대화 중 별이가 자연스럽게 끼어들기 적절한지 판단.

최근 대화: {recent_messages}
사용자 A: {user_a_summary}
사용자 B: {user_b_summary}

조건:
- 어색한 침묵 → 공통점 노출
- 대화 끊김 → 주제 제안
- 사용자 장점 자연스러운 노출

출력 (JSON only):
{
  "should_intervene": true|false,
  "mediation_text": "...",
  "attribution": null | "AI 추측: ..."
}`,
};
```

**Checkpoint**:
- [ ] Anthropic SDK 통합 (Claude Haiku 4.5)
- [ ] 3 prompt 테스트 (실제 데이터로)
- [ ] 비용 추정 검증 ($0.04/월/사용자)
- [ ] LLM 응답 schema 검증 (Zod 또는 class-validator)
- [ ] 에러 핸들링 (LLM 실패 시 fallback)

---

## Phase 1 종료 — Checkpoint

Phase 1 완료 = 아래 모두 OK:

- [ ] 일꾼 fork 완료 (byeoli-server 레포)
- [ ] 13 테이블 migration 작성 + 검증
- [ ] 사용자·프로필 endpoint 4개 + Swagger 노출
- [ ] 별 §17 카드·xp 시스템 import (60 카드 + 응답 풀)
- [ ] LLM prompt 3개 통합 + 비용 검증
- [ ] OAuth (카카오·Apple) 그대로 작동
- [ ] 시드 데이터 6 사용자 + 카드 답변 + 매칭 후보 1개 검증

→ Phase 2 (프론트) 시작 가능.

---

## Phase 2 시작 가이드 (Phase 1 완료 후)

1. **신규 프론트 레포 생성**:
```bash
mkdir ~/Documents/GitHub/byeoli-frontend
cd ~/Documents/GitHub/byeoli-frontend
npx create-expo-app . --template blank-typescript
# 또는 ASK 프론트에서 fork
git clone https://github.com/jinwoolim-art/ask-frontend ~/Documents/GitHub/byeoli-frontend
cd ~/Documents/GitHub/byeoli-frontend
# brand·라우트 모두 byeoli로 변경
```

2. **온보딩 3 step + 메인 화면** (Phase 2, spec §17.C.1·C.2)
3. **카드 답변 + 별이 대화** (Phase 2, spec §17.C.2)

---

## 의존성·협조

- **클로드_4** (별 §17 구현): 카드·xp·진화 게이트 코드 import 조율
- **클로드_5** (Mediate §17): 매개 매커닉 코드 import 조율 (Phase 4)
- **사합** (일꾼 백엔드): namespace 충돌 없음 (별도 fork·별도 DB)
- **탐님**: 변호사 자문 (병렬 진행), brand·디자인 결정

---

## 트러블슈팅

| 증상 | 진단 | 해결 |
|---|---|---|
| `npm run migration:run` 실패 | TypeORM 버전 충돌 | 일꾼 package.json 그대로 사용 |
| OAuth 콜백 안 옴 | 카카오 콘솔 redirect URI | 메모리 [[kakao-console-redirect-uri]] 참고 |
| LLM 응답 schema 불일치 | prompt 정밀도 ↓ | 예시 추가 (few-shot) |
| 카드 답변 후 성향 update 안 됨 | `match_personality` PK 없음 | user_id PK 확인 |
| Founder badge 잘못 부여 | 동시성 race | `SERIALIZABLE` isolation level |

---

## 다음 세션 시작 prompt 예시 (클로드_5)

새 세션 시작 시 첫 prompt:

> 별이(Match) Phase 1 구현 시작합니다. byeoli-match/docs/spec.md + phase1-implementation-guide.md 읽고 Step 1부터 진행해주세요. 클로드_4와 별 §17 import 조율, 탐님 변호사 자문 병렬 진행 중입니다.

---

## 완료 후 보고 형식 (탐님께)

Phase 1 종료 시 한 줄 보고:

> Phase 1 완료. byeoli-server fork·13 테이블·사용자 endpoint·카드 60·LLM 3 prompt 모두 작동. Swagger /api/docs 에서 검증 가능. Phase 2 (프론트) 시작 준비됨.
