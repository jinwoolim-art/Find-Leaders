# Brochure 풀 자동화 셋업 가이드

`brochure-product.html` 변경 → PDF 생성 → Drive 새 버전 업로드 → Apps Script 재배포까지 **한 번 명령**으로 처리합니다.

```bash
./scripts/publish-brochure.sh
```

> 🔒 모든 인증/시크릿은 `scripts/.secrets/`, `apps-script/.clasp.json`, `apps-script/.deployment-id`, `~/.clasprc.json` 에 저장됩니다. 모두 `.gitignore`로 제외 — commit되지 않습니다.

---

## 디렉터리 구조

```
Find-Leaders/
├── apps-script/                    ← Apps Script 코드 (clasp 작업 디렉터리)
│   ├── Code.gs                     ← 라이브 Code.gs와 1:1 매핑
│   ├── appsscript.json             ← manifest
│   ├── .clasp.json                 ← scriptId 저장 (gitignored)
│   └── .deployment-id              ← deployment ID 저장 (gitignored)
├── scripts/
│   ├── build-brochure-pdf.sh       ← Phase 1
│   ├── upload-brochure-to-drive.py ← Phase 2
│   ├── publish-brochure.sh         ← 통합 배포
│   ├── requirements.txt
│   ├── SETUP.md                    ← 이 문서
│   └── .secrets/                   ← OAuth credentials/token (gitignored)
│       ├── credentials.json
│       └── token.json
└── dist/                           ← 생성된 PDF (gitignored)
    └── 일꾼을묻다(소개서).pdf
```

---

## 0. 의존성 설치

```bash
# Python 의존성
python3 -m pip install -r scripts/requirements.txt

# Apps Script CLI
npm install -g @google/clasp
```

> ⚠️ macOS에서 `python3`(=3.9, /usr/bin)와 `pip3`(=3.11, homebrew)가 다른 버전을 가리킬 수 있습니다. 반드시 `python3 -m pip install` 형태로 설치하세요.

---

## 1. Drive OAuth (1회만)

### 1-1. Google Cloud Console에서 OAuth Client ID 생성

1. <https://console.cloud.google.com/> 접속 → **ilkkun.official** 계정으로 로그인
2. 새 프로젝트 만들기 (이름 예: `ilkkun-publisher`) — 이미 있으면 선택
3. 좌측 메뉴 → **API 및 서비스 → 라이브러리** → "Google Drive API" 검색 → **사용 설정**
4. **API 및 서비스 → OAuth 동의 화면**:
   - User Type: **외부**
   - 앱 이름: `ilkkun-publisher`
   - 사용자 지원 이메일: `ilkkun.official@gmail.com`
   - 개발자 연락처: `ilkkun.official@gmail.com`
   - 저장 → 다음 → 다음 (Scopes 추가 안 해도 됨, 코드에서 요청)
   - **테스트 사용자**에 `ilkkun.official@gmail.com` 추가 → 저장
5. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**:
   - 애플리케이션 유형: **데스크톱 앱**
   - 이름: `ilkkun-publisher-desktop`
   - 만들기 → **JSON 다운로드** 버튼 클릭
6. 다운로드한 JSON을 다음 경로로 저장:
   ```
   scripts/.secrets/credentials.json
   ```

### 1-2. 첫 인증 (브라우저 OAuth)

```bash
./scripts/build-brochure-pdf.sh             # PDF가 dist/에 있어야 함
python3 scripts/upload-brochure-to-drive.py
```

브라우저 자동 열림 → ilkkun.official 계정 선택 → "확인되지 않은 앱입니다" 화면이 나오면 **고급 → 안전하지 않은 페이지로 이동** → Drive 권한 허용.

→ `scripts/.secrets/token.json` 생성됨. 이후 자동 갱신됩니다.

---

## 2. Apps Script (clasp) 셋업 (1회만)

### 2-1. clasp 로그인

```bash
clasp login
```

브라우저 열림 → **ilkkun.official** 계정 선택 → 권한 허용 → `~/.clasprc.json`에 토큰 저장.

> ⚠️ Apps Script API가 비활성 상태라면: <https://script.google.com/home/usersettings> → **Google Apps Script API: ON**

### 2-2. 기존 프로젝트와 연결

`apps-script/.clasp.json` 파일을 다음 내용으로 생성 (Script ID는 탐님이 알려주신 값):

```json
{
  "scriptId": "<여기에 SCRIPT_ID 붙여넣기>",
  "rootDir": "."
}
```

> 💡 `rootDir: "."`은 `.clasp.json` **자체가 있는 디렉터리** 기준 — 즉 `apps-script/` 그 자체. 그래서 `apps-script/Code.gs`와 `apps-script/appsscript.json`을 sync.

> Script ID 찾는 법: Apps Script 콘솔(<https://script.google.com>)에서 프로젝트 열면 URL이 `https://script.google.com/d/<SCRIPT_ID>/edit` 형태. `<SCRIPT_ID>` 부분 복사.

### 2-3. 라이브 코드 sanity check (권장)

```bash
cd apps-script
clasp pull          # 라이브 코드 다운로드 — Code.gs/appsscript.json 덮어씀

# 우리 작업분(요금 5카드, 메일 본문 카피)이 라이브로부터 누락된 게 맞는지 확인
git diff Code.gs    # 변경 라인 보기
```

**git diff에서 우리 변경(예: "후보자 페이지 운영", '교육감': 1290000 등)이 보이면** → 라이브에는 옛 버전이 살아있다는 의미. 우리 변경을 살리고 싶으면:

```bash
git checkout Code.gs   # 우리 작업분으로 복원
clasp push -f          # 라이브에 push
```

**라이브에 우리가 모르는 새 코드가 추가**되어 있으면(diff에서 우리가 안 만든 코드가 라이브에서 와있으면) → 그 코드는 라이브에서 직접 누군가 편집한 흔적. 우리 repo로 가져와 commit 후 push할지, 우리 변경을 라이브에 덮어쓸지 결정.

### 2-4. Deployment ID 잡기 (Web App URL 보존)

기존 운영 중인 deployment ID를 잡아두면 매번 같은 URL로 갱신됩니다. (URL이 바뀌면 admin-dashboard.html의 `WEB_APP_URL`도 매번 갱신해야 함 — 비추천)

```bash
cd apps-script
clasp deployments
```

출력 예:
```
- AKfycby... @1 - 운영용
- AKfycbx... @HEAD - 개발용
```

**현재 운영 중인 deployment ID** (예: `AKfycby...`)를 복사해서 다음 파일에 저장:

```bash
echo "AKfycby...붙여넣기..." > apps-script/.deployment-id
```

> 💡 어떤 게 운영 deployment인지 모르면: Apps Script 콘솔 우측 상단 **배포 → 배포 관리** → 활성 deployment 옆 ID. 또는 `admin-dashboard.html`의 `WEB_APP_URL` 안에 박힌 deployment ID와 일치하는 것.

---

## 3. 통합 배포 명령

셋업 완료 후 — `brochure-product.html` 또는 `apps-script/Code.gs`를 수정한 뒤:

```bash
./scripts/publish-brochure.sh
```

자동으로 진행:
1. `brochure-product.html` → `dist/일꾼을묻다(소개서).pdf` 생성
2. Drive에 새 버전 업로드 (BROCHURE_FILE_ID 보존)
3. `clasp push -f` (apps-script/ 코드 라이브 sync)
4. `clasp deploy --deploymentId <ID>` (URL 보존, 새 버전)

---

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `❌ 의존성 미설치` | pip 설치 안 됨 또는 다른 python에 설치됨 | `python3 -m pip install -r scripts/requirements.txt` |
| OAuth `redirect_uri_mismatch` | OAuth Client 유형 잘못됨 | "데스크톱 앱"으로 다시 생성 |
| `403: Drive API has not been used` | Drive API 비활성 | Cloud Console → API 라이브러리에서 활성화 |
| `clasp push` 실패 (`User has not enabled the Apps Script API`) | Apps Script API 비활성 | <https://script.google.com/home/usersettings> ON |
| Drive 업로드 시 `404` | BROCHURE_FILE_ID 잘못됨 또는 공유 안 됨 | `apps-script/Code.gs`의 ID 확인, 파일이 ilkkun.official 계정 Drive에 있는지 확인 |
| `clasp deploy` 실패 (`Deployment id is not valid`) | `.deployment-id` 값 잘못됨 | `cd apps-script && clasp deployments`로 ID 다시 확인 |
| Web App URL이 매번 바뀜 | `--deploymentId` 없이 deploy됨 | `apps-script/.deployment-id` 또는 `CLASP_DEPLOYMENT_ID` 환경변수 설정 |

---

## 5. 시크릿 파일 위치 정리

| 파일 | 용도 | 어디 | gitignored |
|---|---|---|---|
| `scripts/.secrets/credentials.json` | OAuth Client (Cloud Console에서 다운로드) | repo 안 | ✅ |
| `scripts/.secrets/token.json` | OAuth Refresh Token (자동 생성) | repo 안 | ✅ |
| `~/.clasprc.json` | clasp 로그인 토큰 (자동 생성) | 홈 디렉터리 | (홈) |
| `apps-script/.clasp.json` | Script ID 저장 | repo 안 | ✅ |
| `apps-script/.deployment-id` | 운영 deployment ID | repo 안 | ✅ |

> ⚠️ **commit 절대 금지**: 위 5개. 이미 `.gitignore`에 등록되어 있지만, `git add .` 같은 광범위 staging 시 실수로 들어갈 수 있으니 항상 `git status`로 확인.
