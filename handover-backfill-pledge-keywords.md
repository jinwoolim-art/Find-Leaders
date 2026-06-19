# Handover — Run `yarn backfill:pledge-keywords` once on prod

**For:** Sahab backend / ops (whoever has access to the deployed `ai-avatar-core` env)
**From:** Tam
**Severity:** Low (no breakage — UI gracefully falls back to title-prefix). Run when convenient.
**Effort:** ~5 minutes of attended runtime; ~hundreds of KRW one-time LLM cost.

---

## Context

Two PRs merged into `dev` on 2026-05-23:

- **PR #17** — `feat(pledge): AI-summarised keyword for candidate pledges`
  Adds `keyword varchar(20) NULL` column to `candidate_profile_pledge` and a
  `PledgeKeywordService` that generates a short 2~5 char Korean keyword from
  the pledge title via OpenRouter (`gpt-4o-mini`).
- **PR #18** — `feat(pledge): normalise category to 6 dashboard categories`
  Pure derive function — no DB / migration / data step.

After CI auto-runs the migration, the new `keyword` column exists but is
**NULL for every existing pledge** (the ~3,395 NEC-imported ones). The app
keeps working — UI is designed to fall back to "first N chars of title" when
keyword is null — but the short keyword chip won't appear until backfilled.

## The one command

```
yarn backfill:pledge-keywords
```

That's it. It:

1. Boots the Nest application context (loads the same `.env` + DB the live
   app uses).
2. Selects every `candidate_profile_pledge` row where `keyword IS NULL`.
3. For each row, calls OpenRouter (`gpt-4o-mini`) with the pledge title and a
   small Korean prompt, parses out a 2~5 char keyword, writes it back to the
   row, moves on.
4. Logs progress every batch.
5. Exits.

**Idempotent** — only touches rows where `keyword IS NULL`. Safe to re-run
(picks up any rows that failed previously, never re-pays for rows that
already have a keyword).

## Options

```
yarn backfill:pledge-keywords --limit=50               # try a small sample first
yarn backfill:pledge-keywords --concurrency=3          # throttle LLM calls
yarn backfill:pledge-keywords --limit=50 --concurrency=3
```

Default concurrency = 5 (modest).

## Required env

The backfill script reads the same `.env` as the running app:

- `OPENROUTER_API_KEY` — must be present (already set in prod).
- `OPENROUTER_MODEL` — defaults to `openai/gpt-4o-mini` (already set).
- Postgres connection — same as the app's.

No additional secrets needed.

## Expected output

```
[backfill-pledge-keywords] starting backfill (concurrency=5)
[PledgeKeywordService] backfill progress 50/3395 (updated 50, failed 0)
[PledgeKeywordService] backfill progress 100/3395 (updated 100, failed 0)
…
[backfill-pledge-keywords] done — scanned 3395, updated 3389, failed 6
```

A few `failed` is normal (e.g. OpenRouter transient errors, weird title input).
Re-running picks them up.

## Cost / quota

- Per pledge: ~250 input tokens + ~10 output tokens × `gpt-4o-mini` price.
- For ~3,395 pledges: a few hundred KRW total. One-time.
- No DB cost.

## Verification after backfill

```sql
SELECT COUNT(*)            AS total,
       COUNT(keyword)      AS with_keyword,
       COUNT(*) - COUNT(keyword) AS still_null
FROM candidate_profile_pledge;
```

Healthy result: `still_null` close to 0 (allow a handful for genuinely
un-keywordable rows).

Spot-check via API: `GET` 오세훈's candidate detail (`huboid 100162984`) —
the first pledge's `keyword` should be a short Korean word like `주택공급`.

## If anything goes wrong

- **Script crashes mid-run** — re-run. Idempotent.
- **All rows failing** — check `OPENROUTER_API_KEY` validity and OpenRouter
  status. Title content is logged on each failure.
- **Want to roll back the column itself** — the migration's `down()` drops
  `keyword`. Re-run `yarn migration:revert`. No data loss elsewhere.

## Contact

Tam — any questions on intended keyword style or limits.

---

**TL;DR** — once: `yarn backfill:pledge-keywords` on prod. Idempotent, safe.
The new keyword column gets filled with 2~5 char Korean keywords.
