# Citizen Q&A — Phase 2: Candidate-Registered Answers

**Repo:** `metarailix/ai-avatar-core` (branch `dev`)
**Author:** Tam (product) — drafted with Claude
**Status:** Draft for Tam review → then Sahab review
**Last updated:** 2026-05-20
**Depends on:** Phase 1 (`citizen-topic-analytics-spec.md`) merged — `question_topic`
table + `chat_turns.matchedTopicId` / `matchSimilarity` must exist.

---

## 1. Background

Phase 1 gives every citizen turn a `matchedTopicId` — the canonical topic its
question was classified to. Phase 2 uses that key for the platform's **core
promised mechanism**: the candidate pre-registers a reviewed answer per topic,
and the chat serves that answer instead of a fresh LLM generation.

Why this matters:
- **Election-law safety** — the served answer is the candidate's own reviewed
  wording, not an LLM improvisation.
- **Cost** — a served answer skips the LLM call (TTS only).
- **Consistency** — the same topic always gets the same vetted answer.
- **Speed** — no LLM round-trip.

This is the mechanism the product already advertises ("130 standard questions,
candidate answers them, platform matches"). Today the backend does free RAG
generation; Phase 2 closes that gap.

---

## 2. Goal

- New table `candidate_topic_answer` — one reviewed answer per (candidate, topic).
- When a citizen question matches a topic the candidate has a **PUBLISHED**
  answer for, serve that answer **verbatim** — no LLM call.
- When there is no published answer (the common case at first), behaviour is
  **unchanged** — fall through to today's RAG/LLM pipeline.

---

## 3. Phasing & risk

| | Scope | Risk | Behaviour change |
|---|---|---|---|
| **Phase 1** (done) | Topic catalog + classify each turn | Low | None |
| **Phase 2** (this doc) | Registered answers + serve them | **Medium** | **Yes** — but only for topics with a PUBLISHED answer |

Phase 2 **does** change what citizens see — that is the point. The change is
bounded: it only activates for a (candidate, topic) pair that has an explicitly
PUBLISHED answer. Every other turn behaves exactly as today.

---

## 4. Data model

### 4.1 New table: `candidate_topic_answer`

```sql
CREATE TABLE "candidate_topic_answer" (
  "id"           uuid         NOT NULL DEFAULT gen_random_uuid(),
  "candidateId"  uuid         NOT NULL,
  "topicId"      uuid         NOT NULL,
  "answerText"   text         NOT NULL,
  "status"       varchar(16)  NOT NULL DEFAULT 'DRAFT',   -- DRAFT | PUBLISHED
  "createdAt"    TIMESTAMP    NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMP    NOT NULL DEFAULT now(),
  CONSTRAINT "PK_candidate_topic_answer" PRIMARY KEY ("id"),
  CONSTRAINT "FK_candidate_topic_answer_candidate"
    FOREIGN KEY ("candidateId") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_candidate_topic_answer_topic"
    FOREIGN KEY ("topicId") REFERENCES "question_topic"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_candidate_topic_answer" UNIQUE ("candidateId", "topicId")
);

CREATE INDEX "IDX_candidate_topic_answer_lookup"
  ON "candidate_topic_answer" ("candidateId", "topicId", "status");
```

- `status` — `DRAFT` while the candidate is writing; `PUBLISHED` makes it live.
  Only `PUBLISHED` answers are ever served.
- `UNIQUE (candidateId, topicId)` — one answer per topic per candidate (upsert).

### 4.2 Modify `chat_turns`

```sql
ALTER TABLE "chat_turns"
  ADD COLUMN "servedTopicAnswerId" uuid NULL
    REFERENCES "candidate_topic_answer"("id") ON DELETE SET NULL;
```

- Set when a turn was served from a registered answer. `NULL` = answered the
  normal way (LLM / semantic cache). Nullable, additive — existing rows
  untouched. Lets analytics measure registered-answer coverage.

---

## 5. Serving logic

### 5.1 Where it runs

In `realtime-orchestrator.service.ts`, **after** Phase 1 topic classification
(the `matchedTopicId` / `matchSimilarity` are already computed) and **before**
the semantic-cache check and the LLM call.

Precedence: **registered answer > semantic cache > RAG + LLM.** A registered
answer is authoritative (candidate-reviewed), so it wins over a cached LLM
answer.

### 5.2 The decision

Serve a registered answer when **all** hold:
1. `matchedTopicId` is set, **and**
2. `matchSimilarity >= SERVE_THRESHOLD` — a **higher** bar than Phase 1's
   tagging threshold (0.78). Suggested start **0.86**. Serving the wrong
   pre-written answer is worse than a mis-tag, so confidence must be higher.
3. A `candidate_topic_answer` row exists for `(candidateId, matchedTopicId)`
   with `status = 'PUBLISHED'`.

If any fails → fall through to the existing pipeline. **No published answer is
the default state at launch, so most turns are unaffected.**

### 5.3 How the answer is delivered

**Verbatim.** The `answerText` is sent to the citizen as-is (then through TTS),
**not** rephrased by an LLM. Reasons:
- The candidate registered those exact words; an LLM rephrase reintroduces the
  improvisation risk Phase 2 exists to remove.
- Election-law safety depends on serving the reviewed text unchanged.

A fixed greeting/closing wrapper (non-LLM string templating) is acceptable if a
consistent avatar voice is wanted — but the answer body stays verbatim.

### 5.4 The turn record

A served turn writes a `chat_turns` row with:
- `assistantAnswer` = the registered `answerText`
- `servedTopicAnswerId` = the answer row id
- `model` = `NULL`, `totalTokens` = `0` (no LLM call)
- `isFromSemanticCache` = `false`
- `ttsCharacters` = as synthesized
- `matchedTopicId` / `matchSimilarity` = as Phase 1

`payment.service.debitTokenForChat` already handles `totalTokens = 0` + TTS, so
a served turn is billed for TTS only.

---

## 6. Registration API (candidate-facing)

Candidates need to write and publish answers. Minimal endpoints under
`/candidate/topic-answers`:

- **`GET /candidate/topic-answers`** — list every `question_topic` for the
  candidate's election type (+ common topics), each with the candidate's answer
  and status if one exists. Drives the registration UI.
- **`PUT /candidate/topic-answers/:topicId`** — upsert the answer for a topic.
  Body: `{ answerText: string, status: 'DRAFT' | 'PUBLISHED' }`. Enforced by the
  `UNIQUE (candidateId, topicId)` constraint.

The candidate **explicitly** sets `PUBLISHED` — nothing goes live implicitly.

---

## 7. Migrations

Follow the `src/migrations/` timestamp convention.

- **Migration D — `CreateCandidateTopicAnswer`** — table + indexes (§4.1).
- **Migration E — `AddServedTopicAnswerToChatTurns`** — `chat_turns` column + FK
  (§4.2).

Both have a full `down()`. `servedTopicAnswerId` is nullable → no backfill.

---

## 8. Analytics impact

Phase 2 makes one new metric possible and improves an old one:
- **Registered-answer coverage** — share of turns with `servedTopicAnswerId`
  set. Tells a candidate how much of their traffic their own answers cover.
- **`getAnswerRanking`** (Phase 1 follow-up) — for topics served verbatim, the
  answer text is now stable, so "good/worst answer" ranking becomes exact, not
  just topic-grouped.

---

## 9. Open questions for Sahab

1. **Serve threshold** — start `SERVE_THRESHOLD` at 0.86? Tune with the
   `matchSimilarity` distribution once Phase 1 has real traffic.
2. **Precedence vs semantic cache** — confirmed order is registered answer →
   cache → LLM. OK?
3. **Greeting/closing wrapper** — serve `answerText` fully bare, or allow a
   fixed non-LLM template around it? (Product/tone call.)
4. **Empty / very short answers** — should a PUBLISHED answer have a minimum
   length, or is that a frontend validation concern only?

---

## 10. Out of scope

- The candidate-facing **registration UI** in `ai-avatar-host-panel` — separate
  frontend task (replaces the `question-bank.html` prototype). This spec only
  defines the API it calls.
- Multi-language answers (one `answerText` per topic for now).
- Versioning / answer history.
- LLM rephrasing of registered answers (explicitly rejected — see §5.3).

---

## 11. Summary of changes for Sahab

**New:**
- Table `candidate_topic_answer`
- 2 migrations (Create / Alter `chat_turns`)
- `/candidate/topic-answers` — GET (list) + PUT (upsert)
- Orchestrator: serve-registered-answer branch after topic classification

**Modified:**
- `chat_turns` — `+servedTopicAnswerId` (nullable)
- `realtime-orchestrator.service.ts` — registered-answer serving, ahead of
  semantic cache + LLM

**Guarantees:**
- No published answer → behaviour identical to today
- Answers served verbatim — no LLM re-improvisation
- Additive, nullable column; both migrations reversible
- Candidate explicitly publishes — nothing goes live on its own
