# 핸드오버 — voice.html (시민의 한마디 풍선 페이지)

**작성:** 2026-05-25 (탐 + Claude 협업 세션)
**최근 commit:** `06141fa` 이후 (이 문서 작성 시점에 새 commit 추가 예정)
**상태:** 배포 완료, 백엔드 연동 완료, **알려진 dedupe 정밀도 이슈 1건 남음**

---

## 0. 한 줄 요약

틱톡·SNS 캠페인 유입 시민이 가입 없이 자기 동네 후보자에게 한마디를 풍선으로 띄우는 캠페인 페이지. **Apps Script + Google Sheets 백엔드 연동 완료**되어 다른 시민의 메시지가 3초 이내 내 화면에 떠오름. 카운터도 전국 누적 실시간 합산.

**남은 우선순위 작업** (다음 세션):
1. **dedupe 정밀도** (timestamp ms 손실 → clientId 컬럼 추가)
2. **LLM 욕설/토픽 필터** (백엔드에 Claude Haiku 호출 추가)
3. **후보자 메일 발송** (시트 누적 → 주 1회 후보자별 묶음 메일)
4. 모바일 폴링 작동 실제 검증 (다른 폰에서 보낸 게 내 화면에 뜨는지)

---

## 1. 배포 정보

### URL
- **운영**: https://www.illkkun.cloud/voice.html
- **GitHub**: `voice.html` (Find-Leaders repo, main 브랜치)
- **호스팅**: Vercel (main push → 1~2분 자동 배포)

### 백엔드
- **Apps Script 프로젝트**: https://script.google.com/d/1_p6YLSuCcSl5a8e32TIR2LudMhTSf1uHP2fxU4ch1i6lWxE-YpwFxxUL/edit
- **계정**: `ilkkun.official@gmail.com`
- **웹앱 URL** (voice.html에 하드코딩): `https://script.google.com/macros/s/AKfycby7xcDYmlJgXvriMkqi8ZUO9y1Q-Y7yrZYGiQoiLdE69tn8GzZ8UUbxlmX8gqiJxCQIYw/exec`
- **시트 ID**: `1b12nC5b4gKnuCPs-n5X3x5h2MXiFqQvPZcyMJM4BFoQ` (선거_일꾼고객요청메일)
- **시트 탭**: `시민의풍선` (첫 발송 시 자동 생성)

### 로컬 작업
```bash
cd /Users/jin-woolim/Documents/GitHub/Find-Leaders
# Apps Script clasp push
cd apps-script && clasp push
# 그 후 Apps Script 웹에서: 배포 → 배포 관리 → ✏️ → 새 버전 → 배포

# voice.html 푸시
git push origin main  # → Vercel 자동 배포
```

---

## 2. 현재 동작 구조

```
[시민 입력]
    ↓ submitMessage()
    ├─ spawnBalloon(isMine=true) — 즉시 풍선 (UX 피드백)
    └─ postVoice() — Apps Script POST submitVoice → 시트 1 row 추가
                                                    응답 {ok, ts} → lastSeenTs 갱신

[3초마다 폴링]
    loadVoices() → Apps Script GET ?action=listVoices&since=lastSeenTs
    응답 {ok, count, voices: [...]}
    ├─ counter = count (서버 값으로 동기화)
    └─ voices 중 ts > lastSeenTs인 메시지 → spawnBalloon(false) (다른 시민 풍선)
```

### voice.html 주요 함수 위치
| 함수 | 라인 | 역할 |
|---|---|---|
| `WEB_APP_URL` 상수 | ~526 | Apps Script 웹앱 URL |
| `postVoice(payload)` | ~533 | POST submitVoice → 시트 저장 |
| `loadVoices()` | ~548 | GET listVoices 폴링 |
| `shortSido(s)` | ~586 | sido 약자 변환 ("서울특별시" → "서울") |
| `submitMessage()` | ~1170 | 발송 트리거 (즉시 spawn + postVoice) |
| `spawnBalloon(msg, isMine)` | ~825 | 풍선 DOM 생성 + 애니메이션 |
| `init()` | ~660 | 페이지 진입 — 폴링 시작 + NEC 데이터 로드 |

### apps-script/Code.gs 추가 함수
| 함수 | 라인 | 역할 |
|---|---|---|
| `VOICE_SHEET` 상수 | 28 | `'시민의풍선'` |
| `getOrCreateVoiceSheet()` | ~1983 | 시트 탭 자동 생성 (헤더 13개) |
| `submitVoice(data)` | ~2000 | 시트 1 row append, ts 반환 |
| `listVoices(params)` | ~2030 | 최근 N개 + 총 count 반환 (본문 제외) |
| `doPost` 라우터 | 92 | `submitVoice` 액션 추가됨 |
| `doGet` 라우터 | 100 | `listVoices` 액션 추가됨 (e 파라미터 받게 변경) |

### 시트 구조 (`시민의풍선` 탭)
```
timestamp | sido | sigungu | dong | nickname | electionType | electionLabel | candidate | party | candidateNumber | message | topic | tailEmoji
```
- `message` (본문)는 시트에만 저장. listVoices 응답에서 제외 (선거법·페이지 노출 방지)

---

## 3. 알려진 이슈 (다음 세션 우선)

### 🔴 이슈 1 — dedupe 정밀도 (중복 풍선 위험)

**증상**: 즉시 spawn한 자기 풍선과 폴링으로 받은 자기 풍선이 둘 다 뜰 가능성.

**원인**: 
- `postVoice` 응답의 `ts` (서버 `Date.now()`)와
- `listVoices` 응답의 `ts` (시트에서 읽어온 `new Date(serialNumber).getTime()`)
- 사이에 Google Sheets Date serial number 직렬화로 **ms 정밀도 손실** 가능성

**현재 임시 처리**: `data.ts > lastSeenTs`로 갱신 후 폴링에서 `v.ts > lastSeenTs` 조건. ts가 정확히 같으면 skip되지만, ms 손실로 v.ts가 ts+1처럼 나오면 중복 spawn.

**정확한 해결책 (다음 세션)**:
1. `submitVoice` payload에 `clientId` (UUID) 추가
2. `apps-script/Code.gs`의 `getOrCreateVoiceSheet` 헤더에 `clientId` 컬럼 추가 (14번째)
3. `listVoices` 응답에 `clientId` 포함
4. voice.html에 `myClientIds` Set으로 dedupe (myClientIds.has(v.clientId) → skip)

```js
// voice.html 추가
const myClientIds = new Set();
async function postVoice(payload) {
  const cid = 'c_' + Math.random().toString(36).slice(2, 12);
  myClientIds.add(cid);
  setTimeout(() => myClientIds.delete(cid), 5 * 60 * 1000); // 5분 후 정리
  // payload에 clientId 포함
  ...
}
// loadVoices에서
if (myClientIds.has(v.clientId)) { lastSeenTs = Math.max(lastSeenTs, v.ts); continue; }
```

```js
// apps-script/Code.gs submitVoice 수정
sheet.appendRow([
  ts, ..., data.tailEmoji || '💜',
  String(data.clientId || '')  // 14번째 컬럼
]);
// listVoices voices.push에 clientId 추가
voices.push({ ..., clientId: r[13] });
```

### 🟡 이슈 2 — 모바일 폴링 작동 미검증

**상태**: 사용자 1명 + 시크릿 창에서만 테스트됨. 진짜 다른 폰·다른 네트워크에서 보낸 풍선이 떠오르는지 미확인.

**검증 방법**:
- 폰 A에서 풍선 발송 → 폰 B(다른 네트워크)에서 3초 내 풍선 뜨는지
- 시트 행 추가 확인 (시민의풍선 탭)
- Apps Script 실행 로그 (Apps Script 에디터 → 실행 로그)에서 doPost / doGet 호출 시각 확인

### 🟡 이슈 3 — LLM 욕설/토픽 필터 미구현

**현재**: voice.html의 `containsProfanity`(클라이언트 8단어) + `isInvalidNickname`(약 35개 사전)만. 본문은 거의 무필터로 시트에 저장.

**필요 작업**: `submitVoice` 안에서 본문에 대해:
1. 욕설 사전 매칭 (Apps Script에서 정규식 + 한국어 욕설 사전 1000+ 단어)
2. **선택**: Anthropic API (Claude Haiku) 호출로 7개 카테고리 분류 (지지/반대·투표권유·비방·허위·욕설·개인정보·정당후보자명)
3. 통과 → 시트에 `safe` 상태 저장 → listVoices 응답에 포함
4. 의심 → `review` 상태로 저장 → 운영진 검수 후 노출
5. 위반 → `blocked` 저장 + 응답에 `{ok: false, error: '부적절한 표현'}` 반환

**비용 추정**: 일 1만 건 × Haiku 약 $0.0001 = $1/일.

### 🟡 이슈 4 — 후보자 메일 발송 미구현

**필요 작업**: Apps Script 트리거(주 1회)로:
1. `시민의풍선` 시트에서 후보자별로 그룹핑
2. 각 후보자 이메일(`등록된 메일`)로 묶음 메일 발송 — 본문 형식: 시민 닉네임, 지역, 토픽, 본문 100자 미리보기
3. 발송 후 시트에 `delivered_at` 컬럼 표시

**후보자 이메일 수집 방법**: 별도 — NEC OpenAPI는 후보자 이메일 미제공. 후보자 직접 등록 폼 필요 (별도 작업).

---

## 4. 알려진 디자인 결정 (다음 세션 변경 금지 권장)

| 결정 | 이유 |
|---|---|
| 풍선에 본문 노출 X (지역·후보자·토픽만) | 선거법 251조(허위사실)·82조의4(인터넷 게시판) 안전 |
| 닉네임 maxlength 2 | 욕설/비방 표현 거의 불가 — 운영 부담 최소 |
| election label에 "후보자" 자동 suffix | 당선자처럼 보이지 않게 — 선거 전 오해 방지 |
| 풍선 z-index 1~2 (구름 z-5보다 낮음) | 풍선이 구름 영역 도달 시 뒤로 사라짐 (카운터 흡수 효과) |
| 카운터 초기값 0 + 가짜 시뮬레이션 비활성 | 가짜 시민 의견 노출 시 선거법 리스크 — 실제 데이터만 |
| Apps Script POST `Content-Type: text/plain` | CORS preflight 회피 (admin-dashboard.html 동일 패턴) |

---

## 5. 풍선 디자인 사양 (수정 시 참고)

### 풍선 크기
- 기본: `width: 82px`, padding 6/7/8px
- 내 풍선(`.mine`): `width: 100px`, scale-up bounce 애니메이션

### 풍선 안 콘텐츠 (balloonInner 함수)
```
[후보자 지역 풀네임 + 선거유형 라벨]    ← text-[7px]
[정당 약자 + 기호 badge + 후보자명]      ← 후보자명 text-[10px] extrabold
─────── 구분선 ───────
🏷 [토픽]                                  ← chip 형태
[시민 지역 약자]                          ← text-[7px]
[닉네임 시민 (나)]                        ← text-[8px] bold
```

### 풍선 실 + 매달림 이모지 (.mine만)
- 실 left: 50% (풍선 중앙)
- 꼬리(말풍선 tail) left: 26% (좌하단)
- 사용자가 모달 Step 4에서 선택한 이모지 매달림 (살랑살랑 swing + blink)

### 구름 SVG
- viewBox `0 0 400 130`
- width 200% + left -55% (가로 2배 확장, 화면 중앙 정렬)
- height 130px (1배), 카운터 top-3 위치
- path: 좌측 작은 파장 + 중앙 큰 파장(Q quadratic 반원) + 우측 평평한 흰 영역
- V자 cusp(L L 직선) 또는 부드러운 Q (좌측은 L 유지, 우측은 Q로 부드럽게)

### 정당 약자 (PARTY_ABBR)
- 더불어민주당 → 민주
- 국민의힘 → 국힘
- 조국혁신당 → 조국
- 개혁신당 → 개혁
- 정의당/진보당 → 그대로
- 새미래민주당 → 새미래
- 등 20개 정당

---

## 6. NEC 후보자 데이터

### 파일
`assets/candidates-real.json` (6.4MB, 6,736명, 2026-05-25 sync)

### 구조
```json
{
  "_lastSynced": "...",
  "_sgId": "20260603",
  "governor": [...],       // 54명, 시·도지사
  "mayor": [...],          // 577명, 기초단체장 (시장·군수·구청장)
  "council": [...],        // 6047명, 의원 (지역구) — sggName 패턴으로 광역/기초 구분
  "superintendent": [...]  // 58명, 교육감
}
```

### 후보자 객체
```json
{
  "id": "nec_100162343",
  "name": "...",
  "party": "더불어민주당",
  "sido": "전남광주통합특별시",
  "sggName": "강남구가선거구" (또는 "강남구제1선거구"),
  "wiwName": "강남구",
  "number": 1,
  ...
}
```

### 2026 행정구역 개편 반영
- **광주광역시 + 전라남도 → 전남광주통합특별시** (통합)
- **인천 중구·동구 → 검단구·영종구·제물포구** (자치구 개편)
- `scripts/sync-candidates.py`의 `SIDOS` 배열 + `SIDO_NORMALIZE` 후처리로 처리됨

### sync 재실행
```bash
DATA_GO_KR_API_KEY="$(grep ^DATA_GO_KR_API_KEY .env | cut -d= -f2-)" python3 scripts/sync-candidates.py
```

### 광역의원 vs 기초의원 구분 (council 내부)
- 광역의원: `sggName` 패턴 `'제\d+선거구'` (예: "강남구제1선거구")
- 기초의원: `sggName` 패턴 `'[가-하]선거구'` (예: "강남구가선거구")
- `isProvincialSgg(sgg)` 함수가 분류 (voice.html ~620)

---

## 7. 다음 세션 작업 우선순위

### 우선순위 1 (1~2시간) — dedupe 정밀화
- [ ] `apps-script/Code.gs`: `getOrCreateVoiceSheet`에 14번째 컬럼 `clientId` 추가
- [ ] `submitVoice`: data.clientId 받아 시트에 저장
- [ ] `listVoices`: response voices에 clientId 포함
- [ ] `voice.html`: `myClientIds` Set + `postVoice`에서 clientId 생성·전송, `loadVoices`에서 dedupe
- [ ] clasp push + Apps Script 재배포
- [ ] 두 폰에서 테스트

### 우선순위 2 (반나절) — 본문 LLM 필터
- [ ] Anthropic API 키 발급 (탐님)
- [ ] Apps Script `submitVoice`에 Claude Haiku 호출 — 본문 검수
- [ ] 7개 카테고리 분류 (지지·반대·비방·허위·욕설·개인정보·정당후보자명)
- [ ] 통과/검수큐/거부 상태 시트 컬럼 추가
- [ ] 검수큐는 운영진이 별도 시트 보고 승인

### 우선순위 3 (반나절) — 후보자 메일 발송
- [ ] 후보자 이메일 수집 폼 (별도 페이지 또는 가입신청서 활용)
- [ ] Apps Script 트리거: 매주 일요일 09:00 실행
- [ ] 시트에서 후보자별 그룹핑 → 묶음 메일 (Gmail 발송)
- [ ] 발송 후 `delivered_at` 컬럼 마킹

### 우선순위 4 (1~2시간) — 추가 디자인 미세
- [ ] 모바일에서 다른 폰 풍선 실제 검증
- [ ] 사용자 피드백 반영
- [ ] 캠페인 페이지 SEO 최적화 (이미 메타 태그 있음, OG 이미지 추가)

---

## 8. 빠른 디버깅 가이드

### 시민이 풍선 발송했는데 안 뜸
1. **시트 확인**: `시민의풍선` 탭에 row 추가됐는지
   - 추가 X → POST 실패 (네트워크 또는 Apps Script 에러)
   - 추가 O → GET 실패 또는 클라이언트 spawn 실패
2. **Apps Script 실행 로그**: 에디터 → 실행 로그 → submitVoice 호출 시각·에러 확인
3. **브라우저 콘솔**: DevTools → Console에서 `postVoice failed` 등 메시지 확인
4. **WEB_APP_URL 확인**: voice.html에 하드코딩됨. 재배포 후 URL 바뀌면 갱신 필요 (현재는 URL 유지됨)

### 카운터 0에 멈춤
- `loadVoices` 안 호출 또는 응답 실패. `setInterval(loadVoices, 3000)` 확인 (init 함수)

### 다른 시민 풍선 안 보임
- `lastSeenTs` 너무 크게 갱신됨. 초기 0 → 점진적 증가. 새 메시지 ts가 lastSeenTs보다 작으면 skip.
- 시크릿 창에서 다시 테스트 (lastSeenTs 초기화)

### 풍선 디자인 깨짐
- `pointer-events: none` 누락? 풍선이 클릭 가로채면 input/button 안 됨
- z-index: 풍선 1~2, 구름 5, 카운터 30, tap-hint 100, input-overlay 20

---

## 9. 변경 이력 (주요 commit)

| Commit | 변경 |
|---|---|
| `feat(voice): 시민의 한마디 풍선 페이지 + NEC 2026 통합 행정구역` | 초기 voice.html + NEC sync |
| `fix(voice): 모바일 화면 고정 — 100dvh + overflow hidden` | 모바일 레이아웃 |
| `feat(voice): 옵션 1 — 시민 정체성 chip + 이모지 토글 + 연속 발송` | 모바일 UX 흐름 |
| `feat(voice): Apps Script 백엔드 연동 — 다른 시민 풍선 실시간 동기화` | 백엔드 연결 |
| `fix(voice): 풍선 중복 방지 — 즉시 spawn 제거, 폴링으로만 spawn` | 임시 dedupe |
| `feat(voice): 즉시 spawn 복원 + 카톡 스타일 send 버튼 + 핸드오버` | 이 세션 마지막 commit (예정) |

---

## 10. 파일 위치 빠른 참조

```
Find-Leaders/
├── voice.html                                              ← 메인 페이지
├── apps-script/
│   ├── Code.gs                                             ← 백엔드 (submitVoice, listVoices)
│   ├── appsscript.json
│   └── .clasp.json                                         ← scriptId
├── assets/
│   └── candidates-real.json                                ← NEC 후보자 6,736명
├── scripts/
│   └── sync-candidates.py                                  ← NEC API → JSON sync
├── handover-voice-page-citizen-balloon.md                  ← 이 문서
└── docs/
    └── citizen-topic-analytics-spec.ko.md                  ← 토픽 분류 명세 (참고용)
```

---

**다음 세션 첫 명령 추천**:
> "voice.html 인수인계 문서 읽고 우선순위 1번(dedupe 정밀화) 부터 진행해줘"

이 문서 + voice.html + apps-script/Code.gs 3개 파일만 보면 모든 컨텍스트 파악 가능.
