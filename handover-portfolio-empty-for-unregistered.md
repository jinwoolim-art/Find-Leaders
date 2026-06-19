# Handover — Citizen App Portfolio Tab: Show Empty Fields for Unregistered Candidates

**For:** Sahab frontend dev (citizen app, originally built from `ilgun-platform-v3.html` reference)
**From:** Tam
**Severity:** Low (UX / conversion improvement; current behaviour is not broken)
**Effort:** ~10–15 minutes, 1 component (candidate-detail portfolio tab)

---

## Goal

For NEC-imported candidates who have **not yet claimed and filled in their
profile** ("unregistered" / 미가입 후보자), the portfolio tab currently looks
sparse — `인사말` and `주요 성과` sections are simply absent. There is no
visible cue telling the candidate *which* fields are missing.

We want the unregistered portfolio to render with the **same structure** as a
registered candidate, but with **empty boxes** in the candidate-editable
sections. The visible gap then:

- Communicates to the candidate (when they preview their own page) exactly
  which fields they need to fill in by signing up and editing the dashboard
  → motivates sign-up / completion.
- Signals to citizens that the candidate is still in the unregistered state.

## The change

When the candidate is **unregistered** (use the existing flag your system
already exposes — no new flag needed), render the portfolio tab as follows:

| Section | Registered | Unregistered (this change) | Source |
|---|---|---|---|
| Avatar / basic (name, symbol number, party, age, address, education, assets, military) | filled | **same — filled** | NEC auto |
| Tabs (`포트폴리오` / `핵심공약 N`) | as-is | **same** | — |
| 💬 **인사말** (greeting) | text | **empty bordered box, ~4–5 lines tall** | candidate input |
| ✏️ 주요 약력 (career) | text lines | **same — filled** (career1, career2) | NEC auto |
| 🏆 **주요 성과** (achievements) | trophy + text × N | **2 empty bordered boxes, each with a trophy icon on the left** | candidate input |
| Bottom: `AI 아바타와 대화` / `목록으로` | as-is | **same** | — |
| `핵심공약` tab (other tab) | NEC pledges | **same — filled** (PR #17·#18 already in dev) | NEC auto |

## Visual spec (matches the right-most screenshot in Tam's mock)

- Empty box style: light gray border, white background, the same height/width
  as the filled version, **no placeholder text** inside.
- Section label + icon are shown identically to the registered version, so
  the missing-field affordance is clear ("the slot exists, just empty").
- Empty boxes are **display-only** in the citizen view (non-editable; the
  candidate edits via the dashboard, not via this page).
- Distribute the sections so a single screen shows: avatar / 인사말 (empty)
  / 주요 약력 / 주요 성과 (empty) / bottom buttons. The candidate should be
  able to take in the whole missing-fields picture without scrolling far.

## Detection — use what you already have

The system already distinguishes registered vs unregistered (NEC-imported)
candidates — the candidate dashboard locks NEC-imported pledges, and the host
panel knows whether a profile has been claimed. **Reuse that exact flag** for
this rendering branch. No new column / endpoint needed.

When the candidate signs up and edits the dashboard later, the existing
data-flow already populates `인사말` / `주요 성과` for them, and the portfolio
will automatically render the filled version — no extra logic.

## Hard rules

- ❌ **Do not** distort, paraphrase, summarise, or auto-generate any candidate
  content (consistent with the marker-fix handover).
- ❌ **Do not** put visible placeholder text inside the empty boxes
  ("e.g. 가입 후 작성" / etc.). Match the screenshot — empty box only.
- ❌ **Do not** add an inline "click to register" CTA inside the boxes
  (out of scope for this change; if we want one, it goes elsewhere).
- ✅ **Same** field labels, icons, spacing, and order as the registered
  version — the empty boxes must occupy the exact slots where filled content
  would appear.

## Verification

1. Open an NEC-imported candidate (one who has *not* signed up) → portfolio
   tab. **Expect:** empty `인사말` box + 2 empty `주요 성과` boxes
   (with trophy icons). All other sections filled from NEC as before.
2. Open a candidate who *has* signed up and filled their dashboard →
   portfolio tab. **Expect:** behaves exactly as before — full content,
   no empty boxes.
3. Run the existing sign-up flow: take a test NEC-imported candidate,
   complete signup + dashboard input, return to the portfolio.
   **Expect:** the boxes that were empty are now filled with the
   candidate's entered text. No code changes needed for this step.

## Contact

Tam — for any clarifications on visual placement, box sizing, or to
align with the existing registered-portfolio layout.

---

**TL;DR** — keep the registered-portfolio structure; for unregistered, show
empty bordered boxes in `인사말` and `주요 성과` slots; everything else stays
as it is; existing dashboard sign-up flow will fill the boxes naturally.
