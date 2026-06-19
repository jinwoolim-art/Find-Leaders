# Unity Client ↔ Backend API — Contract Review & Action Items

**Date:** 2026-05-20
**Scope:** `ai-avatar-endpoint` (Unity citizen app) reviewed against `ai-avatar-core` API
**API base:** `https://sandbox.thisishilo.ir/api/v1/`
**Branches reviewed:** Unity `origin/Dev-OnGoing` · backend `dev`

This report verifies three flows (Kakao login, Report submission, Citizen Voice
submission) and lists one additional crash-risk finding. The backend side of all
four items is already implemented and live on sandbox — the action items below
are **Unity-client work**.

---

## Summary

| # | Flow | Status | Action |
|---|------|--------|--------|
| 1 | Kakao login | ✅ Verified OK | None |
| 2 | Report submission | 🔴 UI built, not wired to API | Wire to `POST /api/v1/reports` |
| 3 | Citizen Voice submission | 🔴 Not implemented | Build UI + `POST /api/v1/citizen-voices` |
| 4 | `Asset.approvalReviewedAt` DTO | ⚠️ Deserialization crash risk | Make field nullable |

---

## 1. Kakao login — ✅ Verified, no action needed

The 2-step flow in `Assets/Scripts/LoginManager/LoginManager.cs` correctly
matches the backend requirement ("Kakao login is allowed only for an already
authenticated guest user"):

1. `POST /api/v1/auth/mobile/guest-login` → returns guest JWT
2. `POST /api/v1/auth/mobile/kakao-login`
   - Header: `Authorization: Bearer <guest JWT>`
   - Body: `{ "accessToken": "<token from Kakao SDK>" }`
   - → returns the Kakao user JWT

Request/response models (`GuestLoginBodyRequest`, `KakaoLoginBodyRequest`,
`LoginResponseModel`) match the backend DTOs exactly. **No change required.**

---

## 2. Report submission — 🔴 Not wired to the backend

**Current state:** `Assets/Scripts/UIPages/ReportMessagePage/ReportMessagePopUp.cs`
— the popup UI is complete (reason toggles, details input 20–500 chars,
character counter, validation), but the submit handler is a stub:

```csharp
submitButton.onClick.AddListener(() =>
{
    //Submit report logic here
    PlayHideAnimation();
});
```

There is **no call to `/api/v1/reports` anywhere in the project**. The backend
endpoint is live and ready.

**Action:** implement the submit call.

**Contract:**
- `POST /api/v1/reports`
- Header: `Authorization: Bearer <user JWT>` (a guest token is accepted)
- Request body:
  ```json
  {
    "avatarId": "<uuid of the reported avatar>",
    "payload": {
      "policy_content_error": true,
      "hate_speech": false,
      "details": "free-form text from the details input field"
    }
  }
  ```
  `payload` is a free-form object: each selected reason toggle becomes a
  boolean key set to `true`; the details input becomes a `details` string.
- Response: `{ "id": "<uuid>", "createdAt": "<iso8601>" }`

> ⚠️ **Missing input.** `ReportMessagePopUp.ShowPage(data)` currently receives
> only the reported message **text**. The backend keys a report by `avatarId`.
> The avatar id must also be passed into the popup. Update the `ShowPage` call
> site to pass `avatarId` together with the message.

---

## 3. Citizen Voice submission — 🔴 Not implemented in Unity

**Current state:** there is no model, no page, and no API call for citizen
voices anywhere in the Unity project. The backend (citizen submit + candidate
read + admin read) is fully built.

**Action:** implement the submission UI and the API call.

**Contract:**
- `POST /api/v1/citizen-voices`
- Header: `Authorization: Bearer <user JWT>`
- Request body:
  ```json
  {
    "provinceId": "<uuid, required>",
    "sigunguId": "<uuid, optional>",
    "emdId": "<uuid, optional>",
    "body": "<issue text, 10–2000 chars>"
  }
  ```
- Response: `{ "id": "<uuid>", "createdAt": "<iso8601>" }`
- Validation: `provinceId` is required; `body` must be 10–2000 characters.

> The region ids are already available on the client from
> `Assets/Scripts/Utilities/UserLocationSystem/` — `SavedLocation
> { provinceId, sigunguId, emdId }`. Reuse them; only the UI and the POST call
> are new.

---

## 4. `Asset.approvalReviewedAt` — ⚠️ deserialization crash risk

In `Assets/Scripts/CandidateManager/Scripts/Model/CandidateManagerModel.cs`,
`Asset.approvalReviewedAt` is declared as a **non-nullable** `DateTime`.

The backend column is **nullable** (`Date | null`). Newtonsoft (used with no
global error handler) throws `JsonSerializationException` when a `null` is
deserialized into a non-nullable `DateTime`. Because the candidate list is
parsed as a whole (`CandidateManager.cs` → `Wrapper<CandidateInformationModel>`),
a single asset with `approvalReviewedAt: null` fails the **entire candidate
list** for that province / election type.

This becomes relevant with the upcoming NEC candidate-photo import (bulk-inserted
`avatar_asset` rows). The data side is being handled separately (rows inserted
with `approvalReviewedAt` populated), but the robust client-side fix is:

**Action:** change `Asset.approvalReviewedAt` to nullable `DateTime?`.

Recommended as defense-in-depth — a single null timestamp should never be able
to blank out a whole candidate list.

---

## Notes — pre-existing, low priority (optional)

- **`Profile` has no `emd` object.** The model carries `emdId` (string) but not
  the `emd` object the API returns (`emd { id, sigunguId, nameKo, nameEn }`).
  The candidate's 읍/면/동 (neighbourhood) name therefore cannot be shown. Add
  an `emd` object field if that name is needed on screen.
- **`PledgeMapper.ToCategoryFromKey` maps only 3 of 6 categories.** Economy,
  housing, and welfare are mapped; education, environment, and safety pledges
  fall through to `Unknown`. Extend the mapper to cover all six.

---

## Out of scope (already confirmed clean)

- **Location dropdown** — Unity displays the API order as-is (no client-side
  re-sort); the upcoming backend sort change reaches users correctly.
- **Election types** — fetched dynamically, no hard-coded codes; new election
  types appear automatically.
- **News, candidate, pledge models** — fields match the API.
- **Analytics endpoints** — candidate-dashboard only; not consumed by the
  Unity citizen app.
