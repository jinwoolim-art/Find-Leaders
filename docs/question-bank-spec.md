# Question Bank — Backend API & Data Spec

**For: Iran development team (NestJS backend)**
**Version: 1.0 — 2026-05-04**
**Owner: Play4HQ (Korea)**

---

## 1. Overview

Election candidates register pre-written answers to a fixed set of 290 questions. When citizens ask questions through the chat UI, the system finds the most semantically similar pre-answered question and returns the candidate's answer (RAG-style matching, NOT free-form generation).

This document defines the data model, REST API endpoints, and matching flow needed to support this feature.

---

## 2. Question Bank Structure

### 2.1 Source data
Located at: `assets/question-bank.js` — exports `window.QUESTION_BANK` containing all 290 questions.

### 2.2 Question shape
```ts
interface Question {
  id: string;                 // e.g. "h-eco-01" (unique, stable)
  category: string;            // e.g. "economy", "trust"
  categoryLabel: string;       // Korean display label
  audience: 'candidate' | 'operator';
  priority: 1 | 2;             // 1 = essential, 2 = optional
  text: string;                // The question itself
  recommendedLength: string;   // Hint for the candidate
  scope?: 'common' | 'headOfLocal' | 'councilor' | 'superintendent';
}
```

### 2.3 Counts

| Group | Count | Audience |
|---|---|---|
| Common (전 직급) | 50 | 40 candidate + 10 operator |
| 단체장 (head of local) | 80 | candidate |
| 지방의원 (councilor) | 80 | candidate |
| 교육감 (superintendent) | 80 | candidate |
| **Total** | **290** | |

Per scope, a candidate sees: **40 common (audience=candidate) + 80 scope-specific = 120 questions**.

### 2.4 Operator answers
The 10 questions with `audience: "operator"` (category=`platform`) are answered ONCE by the operator (Play4HQ) and shown to ALL candidates equally. Treat these as platform-level FAQ.

---

## 3. Database Schema (PostgreSQL)

### 3.1 `questions` (seed data)
```sql
CREATE TABLE questions (
  id              VARCHAR(32) PRIMARY KEY,         -- e.g. "h-eco-01"
  category        VARCHAR(32) NOT NULL,            -- e.g. "economy"
  category_label  VARCHAR(64) NOT NULL,
  audience        VARCHAR(16) NOT NULL CHECK (audience IN ('candidate','operator')),
  priority        SMALLINT NOT NULL CHECK (priority IN (1,2)),
  text            TEXT NOT NULL,
  scope           VARCHAR(32) NOT NULL CHECK (scope IN ('common','headOfLocal','councilor','superintendent')),
  recommended_length VARCHAR(32),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_questions_scope ON questions(scope);
CREATE INDEX idx_questions_audience ON questions(audience);
```

Seed from `assets/question-bank.js` on initial deployment. Re-running seed should be idempotent (`ON CONFLICT (id) DO NOTHING`).

### 3.2 `answers` (per-candidate)
```sql
CREATE TABLE answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     VARCHAR(32) NOT NULL REFERENCES questions(id),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  embedding       VECTOR(1536),                    -- OpenAI text-embedding-3-small
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, candidate_id)
);
CREATE INDEX idx_answers_candidate ON answers(candidate_id);
CREATE INDEX idx_answers_embedding ON answers USING ivfflat (embedding vector_cosine_ops);
```

Use `pgvector` extension for the `embedding` column. If unavailable, embeddings can be stored in a separate vector store (Pinecone/Weaviate) keyed by `answer.id`.

### 3.3 `operator_answers` (platform-level, single source)
```sql
CREATE TABLE operator_answers (
  question_id     VARCHAR(32) PRIMARY KEY REFERENCES questions(id),
  answer_text     TEXT NOT NULL,
  embedding       VECTOR(1536),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

For `audience='operator'` questions, all candidates share the same answer from this table.

---

## 4. REST API Endpoints

### 4.1 GET `/api/questions`
Returns the question bank for a candidate based on their scope.

**Query params:**
- `scope` (required): `headOfLocal` | `councilor` | `superintendent`
- `audience` (optional): defaults to `candidate`. Pass `all` to include operator questions.

**Response:**
```json
{
  "version": "1.0",
  "scope": "headOfLocal",
  "common": [ Question, ... ],
  "scopeSpecific": [ Question, ... ],
  "operator": [ Question, ... ]
}
```

### 4.2 GET `/api/answers/:candidateId`
Returns all answers for a specific candidate.

**Auth:** JWT, candidate or campaign manager only.

**Response:**
```json
{
  "candidateId": "...",
  "answers": {
    "h-eco-01": { "text": "...", "updatedAt": "..." },
    ...
  },
  "stats": {
    "total": 120,
    "filled": 87,
    "priority1Filled": 65,
    "priority1Total": 70
  }
}
```

### 4.3 POST `/api/answers`
Create or update an answer.

**Auth:** JWT, candidate or campaign manager.

**Body:**
```json
{
  "candidateId": "...",
  "questionId": "h-eco-01",
  "answerText": "..."
}
```

**Behavior:**
- Upsert by `(question_id, candidate_id)`.
- After saving, queue an embedding job (async). Don't block the response.
- Return: `{ ok: true, answerId: "...", embeddingStatus: "queued" }`

### 4.4 POST `/api/answers/bulk`
Bulk save (used when candidate clicks "전체 저장").

**Body:**
```json
{
  "candidateId": "...",
  "answers": [
    { "questionId": "h-eco-01", "answerText": "..." },
    { "questionId": "h-eco-02", "answerText": "..." }
  ]
}
```

### 4.5 DELETE `/api/answers/:candidateId/:questionId`
Soft-delete an answer (set `is_active=FALSE`).

### 4.6 POST `/api/match` — **The core matching endpoint**
Given a citizen's question, find the best-matching pre-answered question for a specific candidate.

**Body:**
```json
{
  "candidateId": "...",
  "userQuestion": "청년 일자리 어떻게 늘려요?",
  "topK": 3
}
```

**Response:**
```json
{
  "matched": true,
  "topK": [
    {
      "questionId": "h-eco-02",
      "questionText": "청년 일자리는 어떻게 늘릴 건가요?",
      "answerText": "...",
      "similarity": 0.91
    },
    ...
  ],
  "bestMatch": {
    "questionId": "h-eco-02",
    "answerText": "...",
    "similarity": 0.91,
    "confidence": "high"  // high | medium | low
  }
}
```

**Behavior:**
1. Embed `userQuestion` using OpenAI `text-embedding-3-small`.
2. Cosine similarity search in `answers.embedding` filtered by `candidate_id`.
3. Also search `operator_answers.embedding` for platform-related questions (always include in candidate pool).
4. Threshold:
   - `similarity >= 0.82` → `confidence: "high"`, return answer directly
   - `0.65 <= similarity < 0.82` → `confidence: "medium"`, return answer with disclaimer
   - `similarity < 0.65` → `matched: false`, fall back to "캠프로 전달" queue

### 4.7 POST `/api/forward-to-campaign`
When matching fails, save the question for campaign manual review.

**Body:**
```json
{
  "candidateId": "...",
  "userQuestion": "...",
  "userId": "...",  // anonymous citizen ID
  "context": { ... }
}
```

Adds to a `forwarded_questions` table, notifies campaign via webhook/Chat.

---

## 5. Embedding Worker

A background job that processes new/updated answers:

1. Listen to a queue (BullMQ on Redis, already in stack).
2. For each `answerId`:
   - Fetch `answer_text` from DB
   - Call OpenAI `text-embedding-3-small` (1536-dim)
   - Store result in `answers.embedding`
3. Retry on failure with exponential backoff.

**Trigger points:**
- After `POST /api/answers` (single)
- After `POST /api/answers/bulk` (multiple)
- Manual: `POST /api/admin/reembed-all`

---

## 6. Citizen-facing Chat Flow (Reference)

When a citizen asks a question through the candidate's chat UI:

```
1. Frontend POST /api/match { candidateId, userQuestion }
2. Backend returns bestMatch
3. If confidence=high: show answer directly with attribution "(후보자 사전 등록 답변)"
4. If confidence=medium: show answer + disclaimer "유사 질문 답변입니다"
5. If matched=false: 
   - Show "캠프로 전달했습니다" message
   - Trigger POST /api/forward-to-campaign
6. Always include AI disclaimer: "AI 안내: 본 응답은 후보자 사전 등록 답변 기반입니다"
```

**No free-form generation.** Always cite the source `questionId`.

---

## 7. Seed Script Pseudocode

```js
// scripts/seed-questions.ts
import { QUESTION_BANK } from '../public/assets/question-bank.js';
import { questions as questionsRepo } from '../src/db';

async function seed() {
  // Common questions
  for (const q of QUESTION_BANK.common) {
    await questionsRepo.upsert({ ...q, scope: 'common' });
  }
  // Scope-specific
  for (const [scope, data] of Object.entries(QUESTION_BANK.byScope)) {
    for (const q of data.questions) {
      await questionsRepo.upsert({ ...q, scope });
    }
  }
}
```

Run on every deployment. Idempotent — only inserts if `id` not exists, updates if `text` changed.

---

## 8. Implementation Priorities

### Phase 3.1 — Minimum viable (1 week)
- [ ] DB schema + seed script
- [ ] GET `/api/questions`
- [ ] GET / POST `/api/answers`
- [ ] No embeddings yet (text-only storage)

### Phase 3.2 — Matching enabled (1 week)
- [ ] pgvector extension + embedding column
- [ ] Embedding worker (OpenAI integration)
- [ ] POST `/api/match`
- [ ] Threshold tuning

### Phase 3.3 — Production hardening
- [ ] Bulk save endpoint
- [ ] Forwarded questions table + Chat notification
- [ ] Admin re-embed-all endpoint
- [ ] Rate limiting per candidate
- [ ] Cache top-K results per candidate (Redis)

---

## 9. Test Cases

Before going live, verify:

| Test | Expected |
|---|---|
| Candidate with 0 answers asks via /match | matched=false (no fallback to other candidates) |
| Same question phrased differently | Top match should be correct (sim > 0.85) |
| Out-of-scope question (e.g. "오늘 날씨는?") | matched=false, forward to campaign |
| Operator question (`c-plat-01`) | Matches against `operator_answers`, not candidate-specific |
| Updated answer (POST again) | Old embedding replaced, new match works within ~5 sec |

---

## 10. Open Questions for Discussion

1. **Embedding model**: OpenAI `text-embedding-3-small` (1536) is the default. Acceptable?
2. **Vector store**: pgvector vs separate (Pinecone/Weaviate)?
3. **Threshold values** (0.82 / 0.65): may need tuning after real data.
4. **Confidence display**: Show similarity score to citizens? Probably not, but for admin dashboard yes.
5. **Multi-language**: Korea-only for now. English/Iranian later? (ilgun-platform-v3_번역.html exists for English UI but answers are Korean-only.)

---

## Contacts

- **Product / Domain (Korea)**: Play4HQ ilkkun.official@gmail.com
- **Frontend reference**: https://www.illkkun.cloud/question-bank.html
- **Source data**: https://www.illkkun.cloud/assets/question-bank.js

---

*This spec is living. Send corrections/questions to the contact above.*
