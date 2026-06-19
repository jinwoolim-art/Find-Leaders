# Handover — District-Level Unified Avatar (Phase 1) → sahab

Date: 2026-05-24
For: sahab `ai-avatar-core` backend team (Alireza)
From: Tam (product) + claude-4 (drafting)

This handover bundles everything sahab needs to add a **district-level neutral guide bot** to `ai-avatar-core`. Front-end work (citizen page + admin page) is already done on Tam's side; the only thing blocking demo is the 3 new endpoints below.

---

## 1. TL;DR

We need a **per-district unified AI avatar** that aggregates a district's candidates + NEC-registered pledges and lets citizens ask comparison/FAQ questions through a neutral chat UI.

- **Pages already built (Find-Leaders repo)**:
  - `district-avatar.html` — citizen-facing chat (currently runs on mocks)
  - `district-avatar-admin.html` — admin control panel (currently writes to localStorage)
- **Backend required (ai-avatar-core repo)**: 3 new endpoints + 2 new tables — full spec in `docs/district-avatar-spec.md`.
- **Phase 1 only**. FAQ CRUD / guardrail editor / log review are Phase 2, out of scope for this PR.

---

## 2. Suggested PR

**Branch name**: `feat/district-avatar-phase1`
**Base**: `dev` (do not push directly to `dev` — open a PR; Tam will orchestrate merge per repo deploy rules)
**Title**: `feat: district-level unified avatar — Phase 1 (chat / config / log endpoints)`

**PR body** (copy/paste this):

```markdown
## Summary

Adds a new neutral, district-level AI avatar so citizens can compare the candidates and NEC-registered pledges within their electoral district through chat. Distinct from the existing per-candidate 1:1 avatar; admin-only operational control to preserve neutrality.

Full spec: `Find-Leaders/docs/district-avatar-spec.md` (attach link to file or paste content).

## New endpoints (3)
- `POST /api/v1/avatars/district-chat` — citizen chat (OptionalAuth)
- `GET/PUT /api/v1/avatars/district-config` — admin control (`X-Admin-Key` guard)
- `POST /api/v1/avatars/district-chat/log` — conversation log (internal)

## New tables (2)
- `district_avatar_config`
- `district_avatar_chat_log`

## Reuses existing modules
- `GET /api/v1/candidates` for candidate lookup
- `PledgeKnowledgeService` for RAG chunks
- Existing LLM client / RAG pipeline

## Guardrails (system prompt enforced)
- No endorsement, no win/loss prediction, no party evaluation
- Always cite candidate names in answers
- Always end body with "최종 판단은 시민님께" (Korean)

## Out of scope (Phase 2, separate PR later)
- FAQ CRUD
- Guardrail / tone text editor
- Conversation log review UI
- Video avatar assets

## Test plan
- [ ] Unit: chat scope detection (directory / summary / compare / faq)
- [ ] Unit: guardrail redirects on endorsement-style questions
- [ ] Integration: PG (prod) + SQLite (CI) compatibility — no `::cast`, no `NULLS LAST`
- [ ] e2e: citizen chat with mocked LLM returns answer + citations[]
- [ ] e2e: admin GET/PUT config with valid `X-Admin-Key`
- [ ] e2e: admin endpoint rejects missing/invalid `X-Admin-Key` (401/403)
- [ ] Migration: `district_avatar_config` and `district_avatar_chat_log` apply cleanly on dev DB
```

---

## 3. Implementation hints (sahab-facing)

These are suggestions, not mandates — sahab knows the repo better.

### 3.1 Module placement
- Controller: `src/modules/avatar/district-avatar.v1.controller.ts`
- Service: `src/modules/avatar/district-avatar.service.ts`
- DTOs: `src/modules/avatar/dto/district-chat.dto.ts`, `district-config.dto.ts`, `district-chat-log.dto.ts`
- Entities: `src/modules/avatar/entities/district-avatar-config.entity.ts`, `district-avatar-chat-log.entity.ts`
- Migrations: `src/database/migrations/{timestamp}-district-avatar.ts`

### 3.2 Admin guard
- New: `src/common/guards/admin-key.guard.ts`
- Reads `X-Admin-Key` header, compares to env `ADMIN_KEY` (single rotating key for Phase 1).
- Apply via `@UseGuards(AdminKeyGuard)` on PUT/GET config routes.

### 3.3 Chat flow (suggested service skeleton)
```ts
async chat(input: DistrictChatInput): Promise<DistrictChatResponse> {
  // 1. Resolve candidates for the district
  const candidates = await this.candidateService.findByDistrict({
    sgId: input.sgId,
    sgTypecode: input.sgTypecode,
    sdName: input.sdName,
    sigunguName: input.sigunguName,
  });

  // 2. Pull RAG chunks (reuse PledgeKnowledgeService)
  const chunks = await this.pledgeKnowledge.findRelevantChunks({
    candidateIds: candidates.map(c => c.id),
    question: input.question,
    topK: 12,
  });

  // 3. Build context + call LLM with guardrail system prompt
  const llmResp = await this.llm.complete({
    system: DISTRICT_GUARDRAIL_PROMPT(input.sggName ?? input.sigunguName),
    user: input.question,
    context: chunks,
  });

  // 4. Extract citations from chunks actually used
  const citations = this.extractCitations(llmResp, chunks, candidates);

  // 5. Determine scope (directory | summary | compare | faq)
  const scope = this.classifyScope(input.question);

  // 6. Async log
  this.logService.write({ ...input, answer: llmResp.text, citations, scope });

  return {
    answer: llmResp.text,
    citations,
    scope,
    footer: '최종 판단은 시민님께',
    sessionId: input.sessionId ?? generateSessionId(),
  };
}
```

### 3.4 PG/SQLite compatibility (important!)
This repo runs PG in prod and SQLite in CI tests. Both must pass:
- ❌ `column::INT` (PG-only)
- ✅ `CAST(column AS INTEGER)` (portable)
- ❌ `ORDER BY ... NULLS LAST` (SQLite doesn't support)
- ✅ `ORDER BY CASE WHEN col IS NULL THEN 1 ELSE 0 END, col`
- `In()` does not guarantee order — sort in JS after fetch if order matters.

---

## 4. What Tam (product) needs to provide

- [ ] Avatar still-image asset (1 set, neutral mascot — not a person). Hosted URL.
- [ ] `ADMIN_KEY` value for production (Tam stores in env, never commit).
- [ ] Confirmation of which `sgTypecode` values are in scope for 2026-06-03 (likely 3, 4, 5, 6, 11).
- [ ] List of 5–10 seed FAQ Q&A for global-mode (procedure/date) — claude-4 will draft, Tam confirms.

---

## 5. Front-end status (already done in Find-Leaders)

| File | Status | Notes |
|---|---|---|
| `district-avatar.html` | ✅ scaffolded | Mock responses via keyword matcher. Will swap `respond()` to `fetch('/api/v1/avatars/district-chat')` once endpoint is live. |
| `district-avatar-admin.html` | ✅ scaffolded | Mock persistence via localStorage. Will swap to GET/PUT `/district-config` once endpoint is live. |
| `docs/district-avatar-spec.md` | ✅ written | Full English spec for sahab. |
| `docs/district-avatar-spec.ko.md` | ✅ written | Korean source of truth for Tam team. |
| Entry from `ilgun-platform-v3.html` | ⏳ pending | Add menu button after sahab confirms endpoint timeline. |

---

## 6. Timeline & deploy rules

- This PR opens against `dev`. **Do not push directly to `dev`** (CI auto-deploys to prod) — Tam will orchestrate merge per existing repo rules.
- After merge: front-end swaps mocks for real endpoints in one small Find-Leaders PR.
- Target demo date: 2026-06-02.

---

## 7. Open questions for sahab

1. Is `PledgeKnowledgeService` already producing chunks for all 9,243 candidates, or only a subset? If subset, what's the backfill ETA?
2. Should `X-Admin-Key` validation be (a) env-based single key, or (b) reuse an existing admin token system? We assumed (a) for Phase 1 simplicity.
3. Which LLM client is currently in use for the per-candidate avatar chat? We'd like to reuse the same client + config for cost/consistency.
4. Is there an existing tenant/scope concept that the district config should attach to, or is it global?

Reply on this thread or schedule a 15-min call.

---

## 8. Related memory (Tam team internal)

- `feedback_sahab_conflict_coordination` — Tam coordinates with sahab directly; claude-4 only writes code/specs.
- `reference_ai_avatar_core_query_portability` — PG/SQLite compat rules.
- `reference_ai_avatar_core_cicd_deploy` — `dev` push = prod deploy.
- `feedback_unity_branch_workflow` — Tam pushes to own branch; merge requires Tam's explicit instruction.
