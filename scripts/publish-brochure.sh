#!/usr/bin/env bash
# brochure 풀 배포 — PDF 생성 → Drive 새 버전 업로드 → Apps Script 재배포
#
# 사전 셋업: scripts/SETUP.md 참고
# 실행: ./scripts/publish-brochure.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS_DIR="$ROOT/apps-script"
DEPLOYMENT_ID_FILE="$APPS_DIR/.deployment-id"

step() {
  printf "\n\033[1;35m▶ %s\033[0m\n" "$1"
}

# ── Step 1: PDF 생성 ────────────────────────────────────────────
step "1/4 PDF 생성"
"$ROOT/scripts/build-brochure-pdf.sh"

# ── Step 2: Drive 새 버전 업로드 (BROCHURE_FILE_ID 보존) ─────────
step "2/4 Drive 새 버전 업로드"
python3 "$ROOT/scripts/upload-brochure-to-drive.py"

# ── Step 3: Apps Script 코드 push ──────────────────────────────
step "3/4 Apps Script 코드 push"
if [[ ! -f "$APPS_DIR/.clasp.json" ]]; then
  echo "❌ $APPS_DIR/.clasp.json 없음 — SETUP.md 2-2 단계 진행 필요" >&2
  exit 1
fi
( cd "$APPS_DIR" && clasp push -f )

# ── Step 4: 기존 deployment 갱신 (URL 보존) ────────────────────
step "4/4 Apps Script 재배포"
DEPLOYMENT_ID="${CLASP_DEPLOYMENT_ID:-}"
if [[ -z "$DEPLOYMENT_ID" && -f "$DEPLOYMENT_ID_FILE" ]]; then
  DEPLOYMENT_ID="$(tr -d '[:space:]' < "$DEPLOYMENT_ID_FILE")"
fi
if [[ -z "$DEPLOYMENT_ID" ]]; then
  echo "❌ deployment ID 미설정" >&2
  echo "   $DEPLOYMENT_ID_FILE 에 저장하거나 CLASP_DEPLOYMENT_ID 환경변수 설정" >&2
  echo "   가져오는 법: cd apps-script && clasp deployments" >&2
  exit 1
fi

DESC="$(date +%Y-%m-%d) brochure 자동 갱신"
( cd "$APPS_DIR" && clasp deploy --deploymentId "$DEPLOYMENT_ID" --description "$DESC" )

printf "\n\033[1;32m✅ 풀 배포 완료\033[0m\n"
echo "   • PDF: dist/일꾼을묻다(소개서).pdf"
echo "   • Drive: BROCHURE_FILE_ID 새 버전 업로드 완료"
echo "   • Apps Script: $DEPLOYMENT_ID 갱신 — $DESC"
echo ""
echo "🧪 검증: 본인 메일로 'illkkun.cloud → 서비스 소개서 받기' 한 번 테스트"
