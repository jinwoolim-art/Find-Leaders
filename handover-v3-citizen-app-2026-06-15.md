# 핸드오버 — v3 시민앱 정식화 + 후보자 대시보드 (2026-06-15)

> 다음 세션이 그대로 이어받도록 정리. 모르면 이 문서 → 관련 메모리 → 코드 순.

## 0. 한 줄 요약
v3(`ilgun-platform-v3.html`)를 **정식 시민앱**으로 만드는 중. Unity(`ai-avatar-endpoint`)는 보관·비활성, 로그인 등 모든 기능을 v3로 이전. 오늘 후보자 데이터 정리 + NEC 사진/공약 + 좋아요 백엔드 연동 + 우리골목 읍면동 필터까지 했고, **로컬 풀스택으로 후보자 대시보드에 좋아요 집계까지 검증** 완료.

---

## 1. 후보자 대시보드 — 경로 & 실행법 (가장 자주 물음)

후보자 대시보드 = **`ai-avatar-host-panel`** (React). sandbox 백엔드 다운이라 **로컬 풀스택**으로 띄움.

**3개 띄우는 순서:**
1. **DB**: Docker Desktop 켜면 `avatar_vector_db`(pgvector, 포트 5432, DB `ai_avatar_core`) 자동 기동. 후보자 6,297명·아바타 들어있음. (`open -a Docker` 후 `docker info` 될 때까지 대기)
2. **백엔드**: `cd ~/Documents/GitHub/ai-avatar-core-interactions && npm run start:dev` → http://localhost:3000 . (⚠️ **메인 `ai-avatar-core`가 아니라 worktree `ai-avatar-core-interactions`** — resolve-huboids/resolve-emd/CORS/게스트좋아요가 이 브랜치에만 있음. `.env`는 메인에서 복사해둠. 첫 기동 전 `npm run migrate` 필요할 수 있음)
3. **프론트**: `cd ~/Documents/GitHub/ai-avatar-host-panel && npm run dev` → http://localhost:5173 (vite proxy `/api`→3000)

**후보자 대시보드 보기**: http://localhost:5173 → 로그인 → http://localhost:5173/en/analytics → **"My Activity"** 탭
- 로그인 계정: `seed-user-1@example.com` / `SeedPassword1!` (아바타 0개)
- **`woosangho@demo.com` / `SeedPassword1!`** — 우상호(NEC) 데모 계정. **받은 좋아요 5** 들어있음(좋아요 연동 검증용). ⚠️ DB에 임시로 email/password 부여한 것(원래 NEC 후보는 로그인 불가). 정식 아님 — 데모 후 정리 고려.
- 통계 항목: 방문자·대화·만족도·방문자추이·Best답변·공약반응·벤치마크 + **❤️받은 좋아요(내가 추가)**

**시민앱(v3)**: 로컬 http://localhost:8847/ilgun-platform-v3.html (`python3 -m http.server 8847` in Find-Leaders) / 배포 https://jinwoolim-art.github.io/Find-Leaders/ilgun-platform-v3.html
- ⚠️ `file://`로 열면 JSON fetch 막혀 빈 화면. 반드시 http로.

---

## 2. 오늘 한 작업 (전부 동작 검증됨)

**후보자 데이터 (`assets/candidates-real.json`, v3):**
- 전체 6,736명 복원 + 세그먼트 분배 (governor/district_head/mayor/county_head/city_council/province_council/superintendent + council)
- 사퇴자 3명 제거 (이강산·전희영·김종훈 — NEC API status='사퇴')
- NEC 5대 공약 668명 동기화 (`scripts/sync-pledges.py`, 단체장+교육감만 NEC 제공, 지방의원은 미제공)
- 광역단체장+교육감 NEC 사진 109명 → WebP (`assets/nec-photos/`)
- 상세보기 주요 약력에 학력(education) 포함
- 우리골목 버그 수정: council 분배로 `candidateData.council` 비던 문제 + 지역/읍면동 필터 복원

**좋아요 백엔드 연동 (게스트 세션):**
- v3 하트 클릭 → guest-login → resolve-huboids(huboid→avatar) → react → DB 저장 → 대시보드 집계
- `CITIZEN_API_BASE`: localhost면 `localhost:3000`, 배포면 `sandbox.coobler.ir` 자동 분기. 백엔드 다운 시 localStorage 폴백.

**우리골목 읍면동 필터:**
- 동 선택 → `GET /electoral-districts/resolve-emd?sido&sigungu&emd` → {gwang, gicho 선거구명} → 후보 좁힘
- 검증: 신사동(강남구가선거구) 3명 vs 개포4동(강남구라선거구) 4명
- ⚠️ selectedRegion 동 필드는 `dong` (emd 아님)

**citizen-voice (이전 작업 연장):** 답변(reply) + 인앱 알림(notifications) — PR #24

---

## 3. 브랜치 / PR / worktree

| 레포 | 브랜치/커밋 | 내용 | 상태 |
|---|---|---|---|
| Find-Leaders | `main` `95cf370` | v3 정식앱화 (112파일) | ✅ push(배포) |
| ai-avatar-core | `feat/v3-citizen-interactions` `09ee276` | resolve-huboids·게스트좋아요·CORS·resolve-emd | ✅ push, **머지 대기** |
| ai-avatar-core | `feat/citizen-voice-ai-summary` (PR #24) | citizen-voice 요약·답변·알림 | ✅ push, **머지 대기** |
| ai-avatar-host-panel | (미커밋) | 좋아요 카드(AnalyticsPage) | ⏸ 기존작업과 섞여 보류 |

**worktree** (작업용, dev 기준):
- `~/Documents/GitHub/ai-avatar-core-interactions` ← 로컬 백엔드 실행 중 (feat/v3-citizen-interactions)
- `~/Documents/GitHub/ai-avatar-core-cv-summary` (citizen-voice PR #24)
- `~/Documents/GitHub/ai-avatar-host-panel-cv-summary` (citizen-voice host-panel)

---

## 4. 해야 할 것 (우선순위)

1. **[진행중 bg] 전체 사진 다운로드** — `ai-avatar-core/scripts/nec-photos/playwright/downloads/` 에 시도의원(5)·구시군의원(6) 받는 중. 완료 후:
   - **사퇴자 일괄 정리**: 받은 NEC 명부 전체와 `candidates-real.json` 대조 → 명부에 없는 후보(사퇴자) 제거 (오늘 governor 3명만 함)
   - **전체 사진 추출·WebP**: `parse_all.py`(헤더 동적 매핑 적용됨) → `match_to_v3.py` → assets. v3 적용은 "사진 일부만"이라 광역+교육감 유지, 나머지는 별도 보관(서버 개시용)
2. **host-panel 좋아요 카드 분리 커밋** — 탐님 다른 미커밋 작업(api.ts·vite.config·AnalyticsPage)과 섞여 있어 `git add -p`로 좋아요 부분만 분리 필요. (AnalyticsPage: KPI grid에 ❤️받은좋아요 + listCandidateAvatars likeBalance 합)
3. **공약 공감 백엔드 연동** — 좋아요(react)와 동일 패턴. 백엔드 `togglePledgeEmpathy` 이미 있음(avatar.service). v3 pledges 카드에 공감 버튼 + 백엔드 pledge react 매핑.
4. **PR 머지** — 백엔드 2개 PR(`feat/v3-citizen-interactions`, #24)은 dev=프로덕션이라 **탐님이 사합(Alireza)에게 영어로 지시**. 머지 시 자동 배포+마이그레이션. resolve-emd의 enableCors `origin:true`는 PR 리뷰 시 화이트리스트로 조이기 권장.
5. **sandbox 백엔드 가동** — 배포 v3 실연동하려면 sandbox(비용문제 다운) 또는 prod 가동 필요(관리부 영역).

---

## 5. 주의사항
- **production**: Find-Leaders `main` push=GitHub Pages 배포. ai-avatar-core dev push/merge=자동 prod 배포+마이그레이션. 작은 단위·additive·탐 확인.
- **사합 영역**(avatar/auth/analytics 등 공유 레포) 조율은 탐이 직접. 우리는 코드/PR.
- **메인 ai-avatar-core 워킹트리** = `fix/candidate-list-symbol-number-order` + nec-photos 스크립트 수정(download.mjs sggCityCode/parse_xlsx 헤더동적) uncommitted. 사진 작업용. 건드리지 말 것.
- 게스트 deviceType: 백엔드가 android/ios만 허용 → v3는 데모로 'android' 전송. 정식화 시 백엔드 MOBILE_DEVICE_TYPE에 'web' 추가.
- 끌 때: 백엔드/vite kill, `docker stop avatar_vector_db`.

관련 메모리: [[project_citizen_voice_ai_summary]] [[project_ilkkun_local_fullstack_demo]] [[reference_district_candidate_matching]] [[reference_host_panel_test_login]] [[project_sandbox_backend_down]]
