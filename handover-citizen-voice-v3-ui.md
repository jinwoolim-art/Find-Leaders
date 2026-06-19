# 인수인계 — v3 시민앱의 "시민 의견(citizen-voice)" UI 구현

> **새 세션용.** 백엔드는 전부 완성·검증됐고, **v3 프론트 UI만 만들면 됩니다.**
> 작업 디렉토리: `/Users/jin-woolim/Documents/GitHub/Find-Leaders`, 파일: `ilgun-platform-v3.html`

---

## 0. 무엇을 만드는가
시민이 후보자에게 **의견/제안**을 보내는 기능. 흐름:
1. 시민이 의견 입력 → **AI가 한 줄 요약** → 시민이 **확인("위 내용이 맞습니다")** → 전달
   (잘못 전달 방지 + 책임소지: 원문·AI요약·시민확정본·확인시각 모두 저장)
2. 시민 **마이페이지**에 "내 의견 + 후보자 답변"이 함께 보임
3. 후보자가 답변하면 시민에게 **인앱 알림**

→ 백엔드 API·DB 전부 완료. **v3에 ① 의견 작성 흐름 ② 마이페이지 내 의견/답변 ③ 알림 UI** 만 만들면 됨.

---

## 1. 로컬 환경 먼저 띄우기
1. Docker Desktop 켜기 → `avatar_vector_db`(5432) 자동
2. 백엔드: `cd ~/Documents/GitHub/ai-avatar-core-interactions && npm run start:dev` → **localhost:3000**
   (⚠️ 메인 ai-avatar-core 아님! worktree `-interactions`. citizen-voice 요약/답변/알림이 여기 cherry-pick 돼 있음. migrate 이미 적용됨)
3. v3: `cd ~/Documents/GitHub/Find-Leaders && python3 -m http.server 8847` → **http://localhost:8847/ilgun-platform-v3.html** (file:// 금지)

---

## 2. 백엔드 API (전부 동작 검증됨, 게스트 토큰으로)

**게스트 세션** (v3에 `ensureGuestSession()` 이미 있음, `CITIZEN_API_BASE`도 localhost/sandbox 자동분기):
```
POST /api/v1/auth/mobile/guest-login  {deviceId, deviceType:"android"}  → {access_token}
```
⚠️ deviceType은 'android'만 허용(백엔드 web 미지원 — 임시). 이후 모든 호출에 `Authorization: Bearer <access_token>`.

**의견 작성:**
```
POST /api/v1/citizen-voices/preview  {body}  → {summary}     # AI 요약만, 저장 안 함
POST /api/v1/citizen-voices  {provinceId, sigunguId?, emdId?, body, summary?, aiSummary?, confirmed?}
     → {id, createdAt, summary}                               # 확정 저장
```
- `summary`=시민이 확인/수정한 최종본, `aiSummary`=AI 원본(수정 추적용), `confirmed`=true면 확인시각 기록(책임소지)

**마이페이지(내 의견 + 답변):**
```
GET /api/v1/citizen-voices/mine?limit=15&offset=0
    → {data:[{id, body, summary, reply, repliedAt, createdAt, ...}], meta}
```

**알림:**
```
GET   /api/v1/notifications               → {data:[{id,type,title,body,refType,refId,isRead,createdAt}], meta:{total,unreadCount}}
GET   /api/v1/notifications/unread-count   → {unreadCount}
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```
(후보자 답변 시 type='citizen_voice_reply' 알림 자동 생성. refId=voice id)

**지역명 → id (citizen-voices create 의 provinceId 등은 uuid):**
```
GET /api/v1/location/provinces                 → [{id, nameKo}]
GET /api/v1/location/sigungus?provinceId=...    → [{id, nameKo}]
GET /api/v1/location/emds?sigunguId=...         → [{id, nameKo}]
```
v3 `selectedRegion = {sido, sigungu, dong}` (⚠️ 동 필드는 `dong`) 의 **이름**을 위 API로 **id**로 변환해 create에 넣어야 함.

⚠️ **게스트 권한**: 위 API 중 게스트 허용 화이트리스트는 `ai-avatar-core-interactions/src/modules/auth/auth.service.ts` 의 `isAllowedGuestAuthenticatedRequest()`. 이미 추가됨: citizen-voices·preview·notifications·avatars react/resolve. **`location/*` 는 아직 없으니** 거기 GET 화이트리스트에 추가해야 함(또는 location이 public인지 먼저 확인).

---

## 3. v3 프론트 — 만들 곳 (현재 상태)
- **마이페이지** `page-my` (HTML ~845줄). "내 의견" 섹션 **자리만 있음**(~1347줄 "있을 때만"). 렌더 함수 `renderMyPage()` (~4644줄). → 여기에 `GET /citizen-voices/mine` 연동, 의견+답변 카드.
- **의견 작성 진입점**: 홈의 "시민의 목소리" 영역 또는 마이페이지에 "의견 보내기" 버튼 신규. (참고: 별도 `voice.html`은 Google Apps Script 쓰는 옛 버전 — 건드리지 말 것)
- **연동 레이어**(이미 있음, `<script>` 상단): `CITIZEN_API_BASE`, `ensureGuestSession()`, `_citizenToken`, `huboidOf()`, 좋아요용 함수들. 같은 패턴으로 citizen-voice fetch 함수 추가하면 됨.
- **알림 배지**: 하단 탭/헤더에 unread-count 표시.

### UI 흐름 권장
1. 의견 작성 모달: `<textarea>` 입력 → [요약 보기] → `preview` 호출 → **요약 카드(수정 가능) + "☑ 위 내용이 맞습니다" 체크 + [후보자에게 전달]** → `create`(confirmed:true, summary, aiSummary) → 완료 토스트
2. 마이페이지: `mine` → 카드마다 [내 의견 원문/요약] + [후보자 답변 or "답변 대기중"]
3. 진입 시 `unread-count` 폴링 → 배지. 알림 목록 → 읽음 처리.

---

## 4. 주의사항
- v3는 정적 HTML. 백엔드 다운/실패 시 조용히 폴백(좋아요가 그렇게 돼 있음). 의견도 실패 시 안내.
- production: Find-Leaders `main` push = GitHub Pages 배포. 배포 백엔드(sandbox)는 다운 → 로컬에서만 실연동 데모 가능.
- 게스트 deviceType 'android' 임시. 책임소지(confirmed/aiSummary/summary 분리)는 이미 백엔드에 반영됨 — UI에서 confirmed:true 보내고 summary는 시민 수정본 보낼 것.
- 백엔드 PR: citizen-voice는 `feat/citizen-voice-ai-summary`(PR #24, 머지 대기). 좋아요/읍면동은 `feat/v3-citizen-interactions`. 로컬 -interactions worktree엔 둘 다 적용돼 있음(cherry-pick).

## 5. 먼저 읽을 것
- `handover-v3-citizen-app-2026-06-15.md` (전체 맥락: v3 정식앱화, 후보자 대시보드 경로 등)
- 메모리 `project_citizen_voice_ai_summary`, `project_v3_citizen_app_handover`
