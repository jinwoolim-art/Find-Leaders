# District-Level Unified Avatar Spec — Phase 1

Date: 2026-05-24
Authors: Tam (product) + claude-4 (drafting)
Audience: sahab `ai-avatar-core` backend team
Korean source of truth: [`district-avatar-spec.ko.md`](./district-avatar-spec.ko.md)

---

## 1. Background / Goal

- Citizens chat with a **neutral district-level AI avatar** that aggregates the candidates and NEC-registered pledges of their electoral district.
- Distinct from the existing **per-candidate 1:1 avatar** — this one represents the district itself, not any individual.
- Demo-ready before the 2026-06-03 general election (1-week sprint).
- Operational control is **admin-only (Tam)**. Candidates cannot edit, to preserve neutrality.

---

## 2. Scope

### Phase 1 (this sprint, 1 week)
- Citizen-facing standalone page `district-avatar.html`
- Admin control page `district-avatar-admin.html`
  - District search + ON/OFF toggle + 1 avatar asset URL
- 3 new backend endpoints (§5)
- 4 response scopes: ①district candidate roster ②per-candidate pledge summary ③cross-candidate pledge comparison ④procedure/date FAQ
- Guardrails: no candidate endorsement, no win/loss prediction, no party evaluation
- 2 citizen modes:
  - **Global mode**: no address set — FAQ only
  - **Address-based mode**: address set — all 4 scopes active, **all election types on a single screen**

### Phase 2 (post-2026-06-03, out of scope)
- FAQ CRUD (admin authors procedure/date answers directly)
- Guardrail / tone text customization
- Conversation log review (good/bad answer marking → RAG tuning)
- Video avatars (Phase 1 = still image)

---

## 3. Citizen Page (`district-avatar.html`)

### 3.1 URL
- Default: `/district-avatar.html`
- Optional query: `?sgId=&sgTypecode=&province=&sigungu=&sgg=`
- Entry point: button "선거구 안내봇" in `ilgun-platform-v3.html` main menu → opens new page.

### 3.2 UX flow
1. **On enter**: no address → **global mode**. Only procedure/date FAQ. If user asks about candidates/pledges, bot prompts "Please set your neighbourhood first."
2. **"Set neighbourhood"** → province → sigungu → emd cascading dropdowns → confirm. (No election-type selection at this stage.)
3. **After confirm**: show **all election types relevant to that address on a single screen** (e.g. 시장/시의원/구의원/교육감 grouped into tabs or sections).
4. **Chat header toggle**: "Talking about: [Mayor election ▾]". Citizen explicitly picks which election the next question targets. Default = top-level office (mayor or gu-head).
5. **Chat body**: question → `POST /district-chat` (with the currently-toggled sgTypecode) → answer body + citation cards (candidate name + cited pledge snippet).

### 3.3 Screen layout (wireframe)
```
┌─────────────────────────────────────────────┐
│ [logo]  My area: Jongno-gu ▾   [reset]      │
├─────────────────────────────────────────────┤
│ [Unified avatar still image / placeholder]  │
│ "Hello, I'm the Jongno-gu guide bot."       │
├─────────────────────────────────────────────┤
│ ▶ All candidates in your area               │
│ ┌─Mayor─┬─SiCouncil─┬─GuCouncil─┬─SuptEd─┐  │
│ │ [c1][c2][c3] (Mayor: 3)                 │
│ │ ─                                        │
│ │ [c4][c5] (SiCouncil: 2)                 │
│ │ ─                                        │
│ │ [c6][c7][c8] (GuCouncil: 3)             │
│ │ ─                                        │
│ │ [c9] (Supt of Edu: 1)                   │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Chat:                                       │
│ ─── Talking about: [Mayor ▾] ───            │
│  bot> What would you like to know?          │
│  me> Compare education pledges               │
│  bot> [body]                                │
│      📎 [cand A's pledge X] [cand B's Y]    │
│      ⚖ Final judgment is yours              │
├─────────────────────────────────────────────┤
│ [question input]                    [send]  │
└─────────────────────────────────────────────┘
```

### 3.4 Guardrails in citizen UI
- Top banner: "Answers are based on NEC-registered pledges. We do not endorse any candidate."
- Sticky footer on every answer: "⚖ Final judgment is yours."
- Endorsement-style questions ("who's better?", "who should I vote for?") → bot auto-declines and redirects to comparison answer.

---

## 4. Admin Page (`district-avatar-admin.html`)

### 4.1 Access
- URL: `/district-avatar-admin.html`
- Auth: `X-Admin-Key` header (Tam-only)
- Private page, not linked from main menu.

### 4.2 Phase 1 features
- **District search**: province → sigungu → sgg (sggName) tree.
- **ON/OFF toggle**: enable/disable the district's unified avatar.
- **Avatar asset URL field**: one image URL (Tam supplies the asset separately).
- **Save** → `PUT /district-config`.
- **Active districts list** (sidebar).

### 4.3 Phase 2 placeholders (UI tabs reserved, disabled)
- "FAQ answers"
- "Guardrail text editor"
- "Conversation log review"

---

## 5. New Backend Endpoints (3)

All under existing `ai-avatar-core` repo. All compatible with PG (prod) and SQLite (CI). Avoid `::cast` (use `CAST(... AS ...)`) and `NULLS LAST` (use `CASE WHEN ... IS NULL THEN 1 ELSE 0 END`).

### 5.1 `POST /api/v1/avatars/district-chat` — Citizen chat

**Request**
```json
{
  "sgId": "string (NEC sgId)",
  "sgTypecode": "number (3=Mayor, 4=GuHead, 5=SiCouncil, 6=GuCouncil, 11=SuptEdu)",
  "sdName": "string (e.g. 서울특별시)",
  "sigunguName": "string? (e.g. 종로구)",
  "sggName": "string?",
  "question": "string (citizen question)",
  "sessionId": "string? (continuity)"
}
```

**Response (200)**
```json
{
  "answer": "string (body, with candidate names cited)",
  "citations": [
    {
      "candidateId": "uuid",
      "candidateName": "string",
      "pledgeId": "uuid?",
      "snippet": "string (1-2 line quote from the pledge)"
    }
  ],
  "scope": "directory | summary | compare | faq",
  "footer": "최종 판단은 시민님께",
  "sessionId": "string"
}
```

**Internal flow**
1. Look up candidates by `(sgId, sgTypecode, sdName, sigunguName)` — reuse existing `GET /candidates`.
2. Collect each candidate's `pledges[]` — reuse existing `PledgeKnowledgeService` RAG chunks.
3. Build RAG context: candidate name + pledge keyword/category/title/description.
4. Call LLM with the guardrail system prompt (below).
5. Parse response → extract citations.
6. (Optional) async write to `/district-chat/log`.

**System prompt (English baseline, Korean output)**
```
You are the neutral guide bot for the {sggName} electoral district.
You MUST follow these rules:
- Do not endorse, recommend, or rank any candidate.
- Do not predict election outcomes.
- Do not evaluate political parties.
- When quoting a pledge, always cite the candidate's name.
- Use only NEC-registered pledges.
- If the user asks for a recommendation, decline and redirect to a comparison.
- Always end the answer body with "최종 판단은 시민님께".
Output language: Korean. Tone: neutral, factual, brief.
```

**Global-mode handling (no address set)**
- If only `sdName` is provided (no `sigunguName`/`sggName`) → **FAQ scope only**. No candidate answers.
- If user asks about candidates: respond "내 동네를 먼저 설정해주세요" (set your neighbourhood first).

---

### 5.2 `GET/PUT /api/v1/avatars/district-config` — Admin control

**GET**
```
GET /api/v1/avatars/district-config?sgId=&sigunguName=&sggName=
Headers: X-Admin-Key: <admin-key>
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
  "updatedBy": "string"
}
```

**PUT**
```
PUT /api/v1/avatars/district-config
Headers: X-Admin-Key: <admin-key>
Body: same shape as GET response (excluding updatedAt/updatedBy)
```

Persistence: `district_avatar_config` table (§6).

**Auth**: header `X-Admin-Key`. Single rotating key per admin. Validate via existing auth module or a new `AdminKeyGuard`.

---

### 5.3 `POST /api/v1/avatars/district-chat/log` — Conversation log (Phase 2 prep)

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

Phase 1: write-only. Phase 2 will add review UI on top of this.

---

## 6. New Tables (2)

### 6.1 `district_avatar_config`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sg_id | varchar | NEC sgId |
| sg_typecode | int | 3/4/5/6/11 |
| sd_name | varchar | province |
| sigungu_name | varchar? | nullable per election type |
| sgg_name | varchar? | electoral district name |
| enabled | boolean | default false |
| asset_image_url | varchar? | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| updated_by | varchar | admin key id |

Unique index: `(sg_id, sigungu_name, sgg_name)`.

### 6.2 `district_avatar_chat_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | varchar | |
| config_id | uuid FK | nullable (global-mode chats have none) |
| question | text | |
| answer | text | |
| citations | jsonb | |
| scope | varchar | directory/summary/compare/faq |
| created_at | timestamptz | |

Indexes: `(session_id)`, `(config_id, created_at DESC)`.

---

## 7. Copy guidelines (must follow)

### Allowed
- "Guide bot for {district}", "Pledge comparison helper"
- "Based on NEC-registered pledges"
- "Final judgment is yours" / "최종 판단은 시민님께"

### Forbidden
- "AI candidate" / "guaranteed to win" / "election prediction" / "party evaluation"
- Any combination of a candidate name with "recommend", "support", "best", "top choice"

---

## 8. Schedule (proposed)

| D+ | Task | Owner |
|---|---|---|
| D+0 (today) | Korean spec drafted | claude-4 |
| D+1 | English translation (this doc) + Tam review | claude-4 + Tam |
| D+1~3 | Citizen page scaffold (mock) | claude-4 (Find-Leaders repo) |
| D+1~3 | Admin page scaffold (mock) | claude-4 (Find-Leaders repo) |
| D+2~3 | PR draft to ai-avatar-core | claude-4 |
| D+3 | Tam hands spec/PR to sahab | Tam |
| D+5~6 | sahab merges endpoints to dev + front wires real endpoints | sahab + claude-4 |
| D+7 (~06-02) | Demo-ready | |

---

## 9. Open items / follow-ups
- Avatar character asset: Tam to supply still image set.
- Admin auth: `X-Admin-Key` issuance/rotation flow — to be agreed with sahab.
- Global-mode FAQ content: claude-4 will include 5–10 seed Q&A in the sahab PR body (covering 2026-06-03 election dates, voting procedure, ID requirements, early voting).
- Phase 2 PRs (separate): FAQ CRUD / guardrail editor / review UI.

---

## 10. Dependencies on existing ai-avatar-core code

| Existing component | Reused for | File |
|---|---|---|
| `GET /api/v1/candidates` | District candidate lookup | `src/modules/user/portal.v1.controller.ts:234` |
| `CandidateProfileBodyResponseDto.pledges[]` | Pledge data source | `src/modules/user/dto/candidate-profile.response.dto.ts:127` |
| `PledgeKnowledgeService` | RAG chunk source | `src/modules/pledge-knowledge/pledge-knowledge.service.ts` |
| Existing LLM client / RAG pipeline | LLM call | (use existing module) |
| Existing auth guards | `OptionalAuth` for chat, new `AdminKeyGuard` for config | (per repo convention) |

No changes required to existing endpoints. Only additions.

---

## 11. Acceptance criteria (Phase 1 demo)

- [ ] Citizen can open `district-avatar.html`, set their address, and see all election types' candidates on one screen.
- [ ] Citizen can ask "compare education pledges" in chat and receive a comparison answer with citations to ≥2 candidates by name.
- [ ] Endorsement question ("who should I vote for?") is auto-declined with a redirect message.
- [ ] Footer "최종 판단은 시민님께" appears on every answer.
- [ ] Admin can open `district-avatar-admin.html` with valid `X-Admin-Key`, toggle a district ON, set an avatar image URL, and save.
- [ ] Disabled district returns 404 or empty state on `/district-chat`.
- [ ] All chat exchanges are written to `district_avatar_chat_log`.
- [ ] No regression in existing per-candidate avatar flow.
