# Avatar Automation Server — Integration Spec for A-Dashboard

Hi team,

This is the integration spec for the avatar automation pipeline (simplified version, agreed 2026-05-08).

## Overview

A-Dashboard sends one webhook with the candidate's photo. We do the heavy lifting (image generation → ops review → video generation → ops review) on our side. The final video is published at a predictable URL on our server that A-Dashboard can fetch directly.

A-Dashboard does **not** need to expose any callback endpoint to us.

```
A-Dashboard                                Avatar Automation Server
   │
   │  ① POST /webhooks/avatar-image-request ─────►
   │     { candidate_id, source_image_url }
   │  ◄─ 200 OK { expected_video_url }
   │
   │                                              ┌─ Our internal pipeline ─┐
   │                                              │ 1. Generate image       │
   │                                              │ 2. Ops team reviews     │
   │                                              │ 3. Auto-trigger video   │
   │                                              │ 4. Ops team reviews     │
   │                                              │ 5. Publish to video URL │
   │                                              └─────────────────────────┘
   │
   │  ② Fetch the predictable URL whenever ready
   │     GET https://[base]/videos/{candidate_id}.mp4 ─►
   │  ◄─ 200 mp4   (or 404 if not ready yet)
   │
```

Once the file exists at the URL, A-Dashboard downloads and stores it on its own infrastructure.

## What A-Dashboard sends (one webhook)

**`POST {BASE}/webhooks/avatar-image-request`**

Headers:
- `Content-Type: application/json`
- `X-Signature: sha256=<hmac>` (see Security below)
- `X-Timestamp: <unix-seconds>`

Body:
```json
{
  "candidate_id": 14003,
  "source_image_url": "https://your-storage/.../candidate-photo.jpg"
}
```

`candidate_id` accepts either a number (e.g. `14003`) or a string. Whatever you send is stored as-is and used in the video URL.

Response (200):
```json
{
  "ok": true,
  "request_id": "req_xxxxx",
  "candidate_id": "14003",
  "status": "image_queued",
  "expected_video_url": "https://avatar-automation-server-production.up.railway.app/files/videos/14003.mp4",
  "note": "Poll the expected_video_url periodically; it returns 200 with the mp4 once the ops team approves it."
}
```

Save the `expected_video_url` and check it later. Typical end-to-end time: a few minutes for the image stage + a few minutes for the video stage. We recommend polling every 30s starting 2 minutes after the request, with a timeout around 30 minutes.

If the file does not appear within 30 minutes, contact the ops team — there is likely a moderation issue or the candidate's photo failed our internal review.

## What A-Dashboard fetches

**`GET {BASE}/files/videos/{candidate_id}.mp4`** (for now — the base URL will move to `https://avatar.illkkun.cloud/videos/{candidate_id}.mp4` once DNS is connected; we will share the final URL once ready)

- Returns `200` with the mp4 once published
- Returns `404` while the pipeline is still running, or if the request was rejected
- No auth required to GET — these URLs are public-by-policy (the videos are AI-generated character avatars, not the candidate's real photo)

## Security

All POSTs to our webhooks must be signed with HMAC-SHA256 using the shared secret we exchange separately.

- Header: `X-Signature: sha256=<hex>`
- Header: `X-Timestamp: <unix-seconds>` (we reject requests older than 5 minutes)
- Sign the raw request body bytes

Pseudocode (any language):
```
hmac = HMAC_SHA256(secret, body_bytes)
header X-Signature = "sha256=" + hex(hmac)
header X-Timestamp = current_unix_seconds
```

We will share the shared secret over a secure channel (not email).

## Test mode

If `candidate_id` starts with `test_` (e.g. `test_14003`), our server runs the full pipeline normally — image generation, ops review, video generation, ops review — but tagged in our admin UI as a test request and auto-deleted after 24 hours. The expected_video_url still works and the mp4 still appears at the predictable path.

This lets either side run end-to-end tests in production without polluting real candidate data.

## Internal flow (for your information only)

You don't need to track these states, but if you ever ask "where is candidate 14003?" we can tell you:

```
image_queued → image_processing → image_review_pending
                                          │
                                  (ops team approves)
                                          │
                                          ▼
                                  image_approved
                                          │
                                  (auto-trigger video)
                                          │
                                          ▼
                  video_queued → video_processing → video_review_pending
                                                            │
                                                  (ops team approves)
                                                            │
                                                            ▼
                                                      video_ready
                                                  (mp4 now available
                                                   at predictable URL)

image_failed | video_failed (terminal — no mp4 will appear)
```

Total wall time: typically 5–15 minutes per candidate, depending on ops review speed. The image generation step takes ~10–30 seconds; the video generation step takes 1–3 minutes; the rest is ops queue time.

## Concurrency and retries

You can submit multiple candidates in parallel. We process them through internal queues, so peak load just adds queue time — every request eventually goes through.

If you don't see the mp4 after 30 minutes:
- It may have failed our internal moderation (extremely rare with our current vendor)
- Or the candidate photo was unusable (e.g. no face detected)
- In both cases the ops team will reach out to you directly

You can safely re-send the same `candidate_id` with a different `source_image_url` to retry — it overwrites at the same predictable URL.

## What we need from you

1. Confirm the spec works for your data model
2. The shared secret will be sent separately
3. Optional: tell us your A-Dashboard's poll interval so we can adjust capacity if needed

## What we'll send you separately

1. Production webhook base URL: `https://avatar-automation-server-production.up.railway.app` (will move to `https://avatar.illkkun.cloud` once custom domain is set up — same endpoints, just nicer hostname)
2. Shared HMAC secret (over a secure channel, not email)

---

That's the full integration surface. Internal details (image model, video model, prompt management, ops admin UI, retries, storage) live entirely on our side and don't affect this contract.

Please review and let us know if anything needs to change. Thanks!
