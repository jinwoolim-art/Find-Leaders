# Handover — Citizen App "정책 요약" Modal: Preserve Pledge Structure Markers

**For:** Sahab dev team (citizen app on `thisishilo.ir`)
**From:** Tam
**Severity:** High readability bug, blocks launch quality
**Effort:** ~5 minutes, 1 file, ~2 lines

---

## What's wrong

The candidate-detail "정책 요약" (Policy Summary) modal in the citizen app
**drops the structural markers** from pledge content when rendering. Result: the
pledge text becomes a flush-left wall of plain text with no visible hierarchy —
goals, methods, items, sub-items all look the same.

### Source data (NEC, stored on backend — correct)

```
□ 목표 : '신속통합기획 2.0'으로 '31년까지 31만 호 착공

□ 이행방법
  ○ 핵심전략정비구역 지정으로 3년 내 8.5만호 신속 착공
    - 이주·착공 단계에 있는 주요 사업지를 '핵심전략정비구역'으로 관리
  ○ 정비사업 규제 혁파 : 쾌속통합, 신통AI기획, 신통120, 신통확산
    - 쾌속통합 : 추진위 없이 바로 조합설립, …
```

The markers are:

| Marker | Meaning |
|---|---|
| `□` | Section heading (목표 / 이행방법) |
| `○` | Item |
| `-` | Sub-item |
| (none) | Paragraph |

Plus newlines and leading-space indentation that convey nesting depth.

### Current rendering (wrong)

```
목표 : 신속통합기획 2.0 으로 '31년까지 31만 호 착공
이행방법
핵심전략정비구역 지정으로 3년 내 8.5만호 신속 착공
정비사업 규제 혁파 : 쾌속통합, 신통AI기획, 신통120, 신통확산
- 쾌속통합 : 추진위 없이 바로 조합설립, …
```

`□` and `○` characters are stripped. Indentation collapses. The hierarchy is gone.

The host-panel candidate dashboard (where the candidate sees their own pledge)
renders the same backend `description` field **with markers intact** — so the
backend data is correct. The bug is purely in the citizen app's render layer.

---

## Fix — Minimal (1 line, ships today)

Wherever the citizen app outputs the pledge body in the "정책 요약" modal:

1. **Remove** any code that strips or replaces `□`, `○`, or `-`
   (e.g. a `.replace(/[□○]/g, '')` or similar normalization).
2. Render the text inside an element with **`white-space: pre-wrap`** so
   newlines and indentation survive.
3. Output the pledge content **verbatim** (no other transformation).

That single change restores the hierarchy you can see in the dashboard editor.

### Example (React/JSX)

```jsx
// before
<p>{pledge.description.replace(/[□○]/g, '')}</p>

// after
<p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
  {pledge.description}
</p>
```

### Example (vanilla)

```html
<div style="white-space: pre-wrap; word-break: break-word; line-height: 1.6;">
  <!-- inject pledge.description verbatim, no replace() -->
</div>
```

---

## Fix — Enhanced (optional, better typography)

If you want true visual hierarchy (bold section headings, indented items),
parse the content into blocks instead of rendering raw text:

```ts
type PledgeBlock =
  | { type: 'section';  text: string }   // line starts with "□"
  | { type: 'item';     text: string }   // line starts with "○"
  | { type: 'subitem';  text: string }   // line starts with "-"
  | { type: 'paragraph'; text: string }; // anything else

function parsePledgeContent(raw: string): PledgeBlock[] {
  return raw.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'paragraph', text: '' };
    if (trimmed.startsWith('□')) return { type: 'section', text: trimmed.slice(1).trim() };
    if (trimmed.startsWith('○')) return { type: 'item',    text: trimmed.slice(1).trim() };
    if (trimmed.startsWith('-')) return { type: 'subitem', text: trimmed.slice(1).trim() };
    return { type: 'paragraph', text: trimmed };
  });
}
```

Then style each type — section bold + larger, item indented, subitem smaller +
deeper indent, paragraph regular. This is purely additive on top of the minimal
fix; it does not modify or distort the original text.

---

## Hard rules (please don't do)

- ❌ Do **not** strip `□`, `○`, `-` characters from the rendered output.
- ❌ Do **not** auto-summarise, paraphrase, or "clean up" the pledge content
  with an LLM — the candidate's pledge text must remain verbatim
  (legal/electoral integrity, no distortion).
- ❌ Do **not** collapse newlines / indentation.

The structure markers and exact wording **are** the pledge as registered with
NEC. Preserve them.

---

## Where it shows up

The same `description` field flows into three citizen-app surfaces:

1. **핵심공약 list** (candidate-detail "핵심공약" tab) — card with preview
2. **상세보기 modal** — full content ← this is where the bug shows
3. **공약 비교** — side-by-side cards

Fix #1 above (don't strip / `pre-wrap`) applies to all three; #2 (structured
blocks) is most valuable on the full-content modal.

---

## Quick verification after fix

Open the citizen app, navigate to 오세훈 (huboid `100162984`) → 핵심공약 →
첫 번째 공약 ("멈췄던 공급에 속도를! 압도적 주택공급") → 상세보기.

The body should now show `□ 목표`, `□ 이행방법`, `○ …`, `- …` lines exactly
as in the screenshot from the candidate dashboard.

---

## Contact

Tam — for any clarification on intended visual style or fields.
