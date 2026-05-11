#!/usr/bin/env bash
# brochure-product.html → 일꾼을묻다(소개서).pdf
#
# Chrome headless 사용. 첫 실행 후 페이지 수가 의도(19p)와 맞는지 육안 확인 필요.
# 실행: ./scripts/build-brochure-pdf.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/brochure-product.html"
OUT_DIR="$ROOT/dist"
OUT="$OUT_DIR/일꾼을묻다(소개서).pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -f "$SRC" ]]; then
  echo "❌ 소스 없음: $SRC" >&2; exit 1
fi
if [[ ! -x "$CHROME" ]]; then
  echo "❌ Chrome 못 찾음: $CHROME" >&2; exit 1
fi

mkdir -p "$OUT_DIR"

echo "🔨 PDF 생성 중..."
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" \
  "file://$SRC" 2>&1 | grep -v "^$\|DevTools\|Fontconfig\|GPU\|Gpu" || true

if [[ ! -f "$OUT" ]]; then
  echo "❌ PDF 생성 실패" >&2; exit 1
fi

PAGES=$(mdls -name kMDItemNumberOfPages -raw "$OUT" 2>/dev/null || echo "?")
SIZE=$(du -h "$OUT" | cut -f1)
echo "✅ 생성 완료"
echo "   파일: $OUT"
echo "   페이지: $PAGES p"
echo "   크기: $SIZE"
echo ""
echo "다음 단계: Drive의 기존 '일꾼을묻다(소개서).pdf'를 열고 '새 버전 관리'로 위 파일 업로드"
