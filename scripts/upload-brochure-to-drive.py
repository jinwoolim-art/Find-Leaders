#!/usr/bin/env python3
"""
brochure PDF를 Drive의 기존 파일(BROCHURE_FILE_ID)에 새 버전으로 업로드.
파일 ID는 보존되므로 apps-script/Code.gs의 BROCHURE_FILE_ID 수정 불필요.

첫 실행 시 브라우저 OAuth 인증 → token.json 저장 → 이후 자동 갱신.

사전 준비:
  1. Google Cloud Console에서 OAuth 2.0 Client ID (Desktop) 생성
  2. credentials.json 다운로드 → scripts/.secrets/credentials.json 위치
  3. pip3 install -r scripts/requirements.txt
"""

import os
import re
import sys
from pathlib import Path

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
except ImportError:
    print("❌ 의존성 미설치", file=sys.stderr)
    print("   pip3 install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "dist" / "일꾼을묻다(소개서).pdf"
SECRETS_DIR = ROOT / "scripts" / ".secrets"
CREDENTIALS = SECRETS_DIR / "credentials.json"
TOKEN = SECRETS_DIR / "token.json"

# BROCHURE_FILE_ID는 apps-script/Code.gs에서 자동 추출 — 단일 출처로 유지
def _extract_brochure_id() -> str:
    code_path = ROOT / "apps-script" / "Code.gs"
    if not code_path.exists():
        print(f"❌ {code_path} 없음", file=sys.stderr); sys.exit(1)
    m = re.search(r"BROCHURE_FILE_ID\s*=\s*['\"]([^'\"]+)['\"]", code_path.read_text())
    if not m:
        print("❌ Code.gs에서 BROCHURE_FILE_ID 추출 실패", file=sys.stderr); sys.exit(1)
    return m.group(1)


BROCHURE_FILE_ID = _extract_brochure_id()

SCOPES = ["https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/drive"]


def get_credentials() -> Credentials:
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS.exists():
                print(f"❌ {CREDENTIALS} 없음", file=sys.stderr)
                print("   Cloud Console에서 OAuth Client ID(Desktop) 생성 후 다운로드한 JSON을 위 경로로 두세요.", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
            print("\n🌐 자동으로 브라우저가 열립니다. 안 열리면 아래 URL을 직접 여세요:", flush=True)
            creds = flow.run_local_server(
                port=0,
                open_browser=True,
                authorization_prompt_message="\n👉 인증 URL: {url}\n\n⏳ 인증 완료 대기 중...",
            )
        SECRETS_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKEN, "w") as f:
            f.write(creds.to_json())
    return creds


def main() -> int:
    if not PDF_PATH.exists():
        print(f"❌ PDF 없음: {PDF_PATH}", file=sys.stderr)
        print("   먼저 ./scripts/build-brochure-pdf.sh 실행", file=sys.stderr)
        return 1

    creds = get_credentials()
    service = build("drive", "v3", credentials=creds)

    # 기존 파일 메타 확인
    try:
        meta = service.files().get(fileId=BROCHURE_FILE_ID, fields="id,name,size,modifiedTime").execute()
    except Exception as e:
        print(f"❌ 기존 파일 조회 실패 (ID={BROCHURE_FILE_ID}): {e}", file=sys.stderr)
        return 1

    print(f"📄 기존 파일: {meta['name']}")
    print(f"   ID: {meta['id']}")
    print(f"   기존 크기: {int(meta.get('size', 0)):,} bytes")
    print(f"   기존 수정일: {meta.get('modifiedTime', '?')}")

    media = MediaFileUpload(str(PDF_PATH), mimetype="application/pdf", resumable=True)
    print(f"⬆️  업로드 중: {PDF_PATH.name} ({PDF_PATH.stat().st_size:,} bytes)")

    updated = service.files().update(
        fileId=BROCHURE_FILE_ID,
        media_body=media,
        fields="id,name,size,modifiedTime,version",
    ).execute()

    print("✅ 업로드 완료")
    print(f"   ID 보존: {updated['id']}")
    print(f"   새 크기: {int(updated.get('size', 0)):,} bytes")
    print(f"   새 수정일: {updated.get('modifiedTime', '?')}")
    print(f"   리비전: v{updated.get('version', '?')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
