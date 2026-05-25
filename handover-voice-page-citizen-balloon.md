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

### 우선순위 2 (반나절) — 본문 LLM 필터 + 토픽 분류 (한 호출로 묶어 처리)
- [ ] Anthropic API 키 발급 (탐님 — console.anthropic.com)
- [ ] Apps Script `submitVoice`에 Claude Haiku 호출 (1회로 욕설 + 토픽 동시 처리)
- [ ] 7개 위반 카테고리 분류 (지지·반대·비방·허위·욕설·개인정보·정당후보자명)
- [ ] 12개 토픽 분류 (교통·보육·안전·환경·노인일자리·청년일자리·복지·교육·주거·관광·도시재생·기타)
- [ ] 통과/검수큐/거부 상태 + 분류된 토픽 시트 컬럼 추가
- [ ] 검수큐는 운영진이 별도 시트 보고 승인 후 노출
- [ ] 키워드 매칭 fallback (LLM 실패 시 단순 키워드로 토픽 분류)

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

---

## 11. 토픽 분류 — 현재 상태와 작업 방법

### 11.1 현재 상태 (분류 알고리즘 없음)

**실제 시민 입력의 토픽 = `'정책 제안'` 고정** (`voice.html submitMessage()`):
```js
const m = {
  ...,
  topic: '정책 제안', // TODO: 백엔드 LLM 분류 결과 사용
  ...
};
```

풍선에서 본 다양한 토픽(교통/보육/안전 등)은 **시뮬레이션 dummy 데이터**였음. 현재는 시뮬레이션 비활성 — 실제 시민 풍선만 떠오르며 모두 '정책 제안'.

### 11.2 작업 방법 — 단계적

#### Step A: 키워드 매칭 (즉시 가능 — 무료, 30분 작업)

**위치**: `apps-script/Code.gs`의 `submitVoice` 함수 안.

```js
function classifyTopic(message) {
  if (!message) return '기타';
  var m = message.replace(/\s/g, '');
  var keywords = {
    '교통':       ['교통','출퇴근','도로','지하철','버스','차량','막혀','정체','신호'],
    '주차':       ['주차','주차장','주차난'],
    '보육':       ['어린이집','유치원','보육','육아','아이','맞벌이','돌봄'],
    '안전':       ['안전','위험','사고','신호등','CCTV','범죄','치안'],
    '환경':       ['환경','미세먼지','쓰레기','재활용','오염','매연'],
    '청년 일자리': ['청년','일자리','취업','고용','창업','스타트업'],
    '노인 일자리': ['노인','어르신','경로','노후','은퇴','연금'],
    '복지':       ['복지','의료','건강','병원','요양','장애'],
    '교육':       ['교육','학교','학원','입시','학생','선생','교사'],
    '주거':       ['주거','집','아파트','전세','월세','재건축','분양'],
    '도시재생':   ['재개발','재생','구도심','노후','정비'],
    '관광':       ['관광','여행','명소','관광객','외국인'],
    '공원/체육':  ['공원','체육','운동','자전거','산책','한강']
  };
  for (var topic in keywords) {
    var hits = keywords[topic].some(function(kw) { return m.indexOf(kw) !== -1; });
    if (hits) return topic;
  }
  return '기타';  // 매칭 안 되면 명확히 '기타'
}

// submitVoice 안에서 호출
function submitVoice(data) {
  var topic = data.topic || classifyTopic(data.message);
  // ... 시트 저장 시 topic 컬럼에 분류 결과 사용
}
```

**효과**: 약 80% 메시지가 적절한 토픽으로 분류. 매칭 안 되면 '기타' — 운영진이 시트 보고 추후 키워드 추가.

#### Step B: LLM 분류 (정밀 — 일 ~$1, 1~2시간 작업)

키워드 매칭 후에 진행. Step A의 `classifyTopic`을 **Anthropic Claude Haiku 호출**로 교체:

```js
function classifyTopicWithLLM(message) {
  if (!message) return '기타';
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) return classifyTopic(message); // fallback
  try {
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: '다음 시민 메시지를 12개 토픽 중 하나로 분류하세요. 응답은 토픽 이름만:\n\n토픽: 교통, 주차, 보육, 안전, 환경, 청년 일자리, 노인 일자리, 복지, 교육, 주거, 도시재생, 관광, 공원/체육, 기타\n\n메시지: ' + message
        }]
      }),
      muteHttpExceptions: true
    });
    var data = JSON.parse(res.getContentText());
    var topic = (data.content && data.content[0] && data.content[0].text || '').trim();
    return topic || classifyTopic(message);
  } catch (e) {
    return classifyTopic(message); // fallback
  }
}
```

**비용**: 일 1만 건 × 약 $0.0001 = **$1/일**. 한 달 30 USD = 4만원.

#### Step C: 토픽 시트 컬럼 + listVoices 응답 처리

이미 시트 12번째 컬럼이 `topic`. 자동 적용. 별도 수정 X.

### 11.3 권장 진행 순서

1. **Step A 키워드 매칭 먼저 적용** (30분, 무료)
2. 실제 시민 데이터 1주일 운영 — '기타' 비율 측정
3. '기타' 비율이 30%+ 면 Step B LLM 도입
4. '기타' 비율이 낮으면 키워드 사전 추가만으로 충분

---

## 12. 욕설 검수 — 현재 상태와 작업 방법

### 12.1 현재 상태 (클라이언트 사이드, 매우 기본)

**본문 검수** (`voice.html containsProfanity`, ~1185줄):
```js
function containsProfanity(text) {
  const list = ['시발','씨발','병신','개새','좆','존나','지랄','꺼져'];
  const stripped = text.replace(/\s/g, '');
  return list.some(w => stripped.includes(w));
}
```
**사전 크기**: 8개 단어.

**닉네임 검수** (`voice.html isInvalidNickname`):
- 약 35개 (욕설 + 자모 단축 + 후보자/정당 약식)
- 입력 즉시 빨간색 시각 피드백 + 발송 차단

**검수 시점**: 모두 클라이언트 사이드 (`submitMessage()` 직전).

### 12.2 한계 (반드시 보강 필요)

🔴 **우회 가능**:
- DevTools로 JS 차단 후 직접 발송 → 검수 건너뜀
- 또는 fetch로 직접 Apps Script 호출 → 검수 없이 시트 저장

🔴 **사전 매우 작음** (본문 8개):
- 변형 욕설 (시1발, 씨ㅂ, 좆까) 안 잡힘
- 일반 비방어 (멍청이, 바보, 무능) 안 잡힘
- 외래어 욕설 안 잡힘
- 자모 분리 (ㅅㅂ, ㅄ) 본문에서 안 잡힘 — 닉네임만 잡음

### 12.3 작업 방법 — 단계적

#### Step A: Apps Script 서버 검수 (필수, 1시간 작업)

**위치**: `apps-script/Code.gs`의 `submitVoice` 함수 안.

```js
// 한국어 욕설 사전 (1000+ 단어 — 별도 파일 또는 시트 탭으로 관리)
var PROFANITY_KEYWORDS = [
  // 기본 욕설
  '시발','씨발','씨바','시바','씨방','싯팔','싸발','쒸발',
  '좆까','졸라','존나','좃까','좋나','좆나',
  '지랄','지롤','지롸',
  '병신','빙신','뱅신','병ㅅ',
  '새끼','색끼','쌔끼','쌔퀴','시키','싀끼',
  '등신','똥신',
  '니미','늬미','느자','네에미',
  '꺼져','꺼저','쩌네',
  '엿같','엿먹','엿이나',
  '빡쳐','빡친','뒈져','뒤져','뒙','뒤짐',
  // 자모 분리 변형
  'ㅅㅂ','ㅆㅂ','ㅄ','ㅂㅅ','ㅈㄹ','ㄱㅅ','ㅂㅂ','ㅁㅊ',
  // 비방어 일반
  '멍청','바보','무능','쓰레기','병맛','한심',
  // 외래어 욕설
  'fuck','shit','damn','asshole','bitch','f**k',
  // 인종/성별 비하
  '깜둥','짱깨','쪽바리','조선족비하','김치녀','한남'
  // ... 운영 중 추가
];

function containsProfanityServer(text) {
  if (!text) return false;
  var normalized = text.replace(/\s/g, '').toLowerCase();
  // 변형 차단 — 숫자/특수문자로 우회 시도 (시1발, 시.발)
  var stripped = normalized.replace(/[^가-힣ㄱ-ㅎa-z]/g, '');
  return PROFANITY_KEYWORDS.some(function(kw) {
    return normalized.indexOf(kw.toLowerCase()) !== -1 ||
           stripped.indexOf(kw.toLowerCase()) !== -1;
  });
}

// submitVoice 안에서 검수
function submitVoice(data) {
  var msg = String(data.message || '');
  var nickname = String(data.nickname || '');
  if (containsProfanityServer(msg) || containsProfanityServer(nickname)) {
    return json({ok: false, error: '부적절한 표현이 포함되어 있습니다', blocked: true});
  }
  // ... 정상 처리
}
```

**효과**: 우회 차단 + 사전 크게. voice.html은 그대로 두고 백엔드에서 한 번 더 검사 → 이중 안전망.

#### Step B: LLM 모더레이션 (정밀 — Step A의 일부)

11.2 Step B에서 만든 Claude Haiku 호출에 **욕설 + 비방 + 미묘한 표현 판정 같이 처리**:

```js
function moderateAndClassify(message) {
  // 한 번의 LLM 호출로 욕설 판정 + 토픽 분류 + 7개 위반 카테고리
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // fallback: 키워드만
    return {
      profanity: containsProfanityServer(message),
      topic: classifyTopic(message),
      violations: []
    };
  }
  var prompt = `다음 시민 메시지를 분석해 JSON으로 답하세요:
  
메시지: "${message}"

다음 JSON 형식으로 답:
{
  "profanity": true/false,
  "topic": "교통/주차/보육/안전/환경/청년 일자리/노인 일자리/복지/교육/주거/도시재생/관광/공원·체육/기타 중 하나",
  "violations": ["욕설","비방","허위사실","지지","반대","투표권유","개인정보","정당후보자명" 중 해당하는 것들]
}`;

  // ... API 호출
}
```

**효과**: 한 번 호출로 욕설 + 토픽 + 7개 위반 카테고리 모두 판정. 비용 동일.

#### Step C: 검수큐 운영

위반 메시지는 즉시 거부 (response error). 의심(LLM 애매한 판정)은 시트에 `review` 상태로 저장 → 운영진이 별도 시트 보고 승인.

```js
// 시트 컬럼 추가: status (safe/review/blocked)
sheet.appendRow([
  ts, ..., tailEmoji,
  status  // 'safe' | 'review' | 'blocked'
]);
// listVoices에서 status='safe'만 응답에 포함
```

### 12.4 우회 방지 추가 대책

🔒 **Rate limit** — Apps Script에 IP별 호출 제한 (스크립트 속성으로 카운트)
🔒 **Cloudflare Turnstile** 또는 reCAPTCHA — 봇 차단
🔒 **닉네임 + 본문 함께 검사** — 닉네임은 우회해도 본문은 LLM이 잡음

---

## 13. 작업 방법 — 표준 절차

### 13.1 코드 수정 흐름

```
1. 로컬에서 코드 수정
   - voice.html (프론트엔드)
   - apps-script/Code.gs (백엔드)

2. 검증
   - 브라우저에서 http://localhost:8000/voice.html 또는 https://www.illkkun.cloud/voice.html?v=N 열기
   - DevTools Console 확인
   - Apps Script 에디터 → 실행 로그 (server-side)

3. Git commit
   git add voice.html apps-script/Code.gs handover-*.md
   git commit -m "feat/fix(voice): ..."

4. Push
   git push origin main           # Vercel 자동 배포 (1~2분)
   cd apps-script && clasp push   # Apps Script 코드 동기화

5. Apps Script 재배포 (Code.gs 변경 시 필수)
   https://script.google.com/d/1_p6YLSuCcSl5a8e32TIR2LudMhTSf1uHP2fxU4ch1i6lWxE-YpwFxxUL/edit
   → 배포 → 배포 관리 → ✏️ → 새 버전 → 배포
   (URL 유지됨)
```

### 13.2 시트 변경 시

시트 헤더(컬럼) 추가는 `getOrCreateVoiceSheet` 안에서 자동 처리되지만, **이미 생성된 시트의 헤더는 자동 갱신 안 됨**. 옵션:

- (A) 시트 직접 가서 새 컬럼 헤더 수동 추가
- (B) `getOrCreateVoiceSheet` 호출 시 헤더 매번 체크하는 로직 추가
- (C) 시트 탭 삭제 후 재생성 (데이터 손실 주의)

권장 (A) — 작업 시 시트 보고 헤더만 추가하면 됨.

### 13.3 Anthropic API 키 설정

Apps Script 콘솔에서:
1. 프로젝트 열기
2. 좌측 ⚙️ (프로젝트 설정)
3. **스크립트 속성** → 속성 추가:
   - 속성: `ANTHROPIC_API_KEY`
   - 값: `sk-ant-api03-...` (탐님 키)
4. 저장

코드에서 `PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY')` 로 읽기 — Git에 노출 안 됨.

### 13.4 테스트 시나리오

각 변경 후 다음 시나리오 통과 확인:
1. 정상 발송 — 풍선 떠오름, 시트에 row 추가
2. 욕설 본문 발송 시도 — 토스트 + 차단 + 시트에 row 안 추가
3. 욕설 닉네임 발송 — 빨간 시각 + 차단
4. 후보자 미선택 발송 — 모달 자동 열림
5. 다른 시민 풍선 — 시크릿 창에서 보낸 게 메인 창에 3초 내 떠오름
6. 카운터 — 전국 누적, 새로고침해도 유지

---

## 14. 현재 상태 체크리스트

이번 세션 마지막(commit `0bcf27a`) 시점 상태:

### ✅ 완료
- [x] voice.html 시민 풍선 페이지 디자인 (모바일 최적화)
- [x] 카톡 스타일 send 버튼 (input box 안 우측, 보라 ↑)
- [x] enter 키 줄바꿈, send-btn 클릭으로 발송
- [x] 즉시 spawn (자기 풍선 UX) + 3초 폴링 (다른 시민 풍선)
- [x] 임시 dedupe (lastSeenTs 갱신 — 정밀도 80%)
- [x] 카운터 전국 누적 (서버 동기화)
- [x] NEC 후보자 6,736명 데이터 연동
- [x] 2026 행정구역 개편 반영 (전남광주통합특별시, 인천 신설 자치구)
- [x] 5개 선거 유형 분류 (시·도지사/시장·군수·구청장/시·도의원/시·군·구의원/교육감)
- [x] 정당 약자 매핑 (20개 정당)
- [x] 정당 컬러 풍선 (10개 정당 공식 색)
- [x] 풍선에 "후보자" 자동 suffix (오해 방지)
- [x] 닉네임 2자 욕설 필터 (35개 사전)
- [x] 본문 욕설 필터 (8개 사전 — 클라이언트만)
- [x] 이모지 picker (모달 Step 4) — 9개 이모지
- [x] 풍선 실+이모지 (살랑살랑)
- [x] 구름 모양 SVG (Q 반원 + L V자 cusp)
- [x] 카운터 흰 구름 안 안전
- [x] Apps Script 백엔드 (submitVoice + listVoices)
- [x] 시트 '시민의풍선' 탭 (자동 생성)
- [x] tap-hint 버튼 (viewport fixed, 풍선 클릭 가로채기 방지)
- [x] 입력 영역 토글 (탭 토글 UX)
- [x] 100dvh 모바일 viewport 대응
- [x] 개인정보 (i) 안내 모달

### ⚠️ 미완 (다음 세션)
- [ ] **dedupe 정밀도** (clientId 컬럼) — 우선순위 1
- [ ] **토픽 분류** (키워드 → LLM) — 우선순위 2
- [ ] **욕설 서버 검수** (Apps Script) — 우선순위 2
- [ ] **후보자 메일 발송** — 우선순위 3
- [ ] 모바일 폴링 실제 검증 (다른 폰)
- [ ] 운영진 검수 큐 (review 상태 메시지)

### 🔴 알려진 이슈

| # | 이슈 | 영향 | 우선순위 |
|---|---|---|---|
| 1 | 즉시 spawn + 폴링 dedupe 정밀도 손실 | 자기 풍선 중복 가능 (드물게) | 🔴 1 |
| 2 | 본문 토픽 모두 '정책 제안' 고정 | 풍선에 다양한 카테고리 안 보임 | 🟡 2 |
| 3 | 본문 욕설 사전 8개만 | 변형 욕설 시민 발송 가능 | 🟡 2 |
| 4 | 욕설 검수 클라이언트만 | DevTools 우회 가능 | 🟡 2 |
| 5 | 후보자 메일 발송 미구현 | 후보자가 시민 메시지 못 받음 | 🟡 3 |
| 6 | 모바일 폴링 실제 검증 안 함 | 다른 폰 → 내 화면 풍선 안 뜰 수 있음 | 🟡 3 |
| 7 | 광주광역시/전라남도 검색 시 후보자 안 나옴 (별도 행정구역으로 인식) | UI에서 "전남광주통합특별시"로 선택해야 함 | 🟢 4 (안내만으로 충분) |

---

## 15. 다음 세션 시작 가이드

### 첫 명령 추천
```
voice.html 인수인계 문서(handover-voice-page-citizen-balloon.md) 읽고
우선순위 1번(clientId dedupe)부터 진행해줘. 
2번(LLM 필터+토픽 분류)도 같이 처리하면 좋아.
```

### 읽을 파일 (이 순서대로)
1. `handover-voice-page-citizen-balloon.md` ← 이 문서
2. `voice.html` (1500줄 — 풍선 시스템 + 백엔드 호출)
3. `apps-script/Code.gs` (2074줄 — 마지막 100줄이 voice 관련)

### 작업 시작 전 확인
- [ ] git status — 작업 디렉토리 깨끗한지
- [ ] git log -5 — 최근 commit 확인
- [ ] 시트 접근 가능한지 (ilkkun.official 계정)
- [ ] Apps Script 프로젝트 접근 가능한지
- [ ] Anthropic API 키 있는지 (탐님께 확인)

### 작업 완료 후 (이 세션 마무리)
- [ ] handover 문서 갱신 (변경된 부분)
- [ ] commit + push
- [ ] Apps Script 재배포
- [ ] 탐님께 결과 보고 + 다음 우선순위 확인

---

**문서 끝. 다음 세션이 이어서 작업하세요. 🎈**

