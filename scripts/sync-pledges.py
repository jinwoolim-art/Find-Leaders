"""NEC 선거공약 OpenAPI(getCnddtElecPrmsInfoInqire)로 후보자별 5대 공약을 받아
assets/candidates-real.json 각 후보자에 `pledges` 배열을 추가한다.

pledges = [{ "realm": 분야, "title": 제목, "content": 상세 }, ...]  (최대 5)

실행:  python3 scripts/sync-pledges.py
키:    .env 의 DATA_GO_KR_API_KEY
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REAL = ROOT / "assets" / "candidates-real.json"
SG_ID = "20260603"
BASE = "https://apis.data.go.kr/9760000/ElecPrmsInfoInqireService/getCnddtElecPrmsInfoInqire"


def load_key() -> str:
    k = os.environ.get("DATA_GO_KR_API_KEY")
    if k:
        return k.strip()
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("DATA_GO_KR_API_KEY"):
            return line.split("=", 1)[1].strip().strip("'").strip('"')
    sys.exit("DATA_GO_KR_API_KEY 없음")


KEY = load_key()


def tc_for(seg: str, c: dict):
    if seg == "governor":
        return 3
    if seg == "mayor":
        return 4
    if seg == "superintendent":
        return 11
    if seg == "council":
        return 5 if re.search(r"제\d+선거구", c.get("sggName") or "") else 6
    return None


def _grab(body: str, tag: str, i: int) -> str:
    m = re.search(rf"<{tag}{i}>(.*?)</{tag}{i}>", body, re.DOTALL)
    return html.unescape(m.group(1)).strip() if m else ""


def fetch_pledges(huboid: str, tc: int) -> list:
    qs = urllib.parse.urlencode({
        "serviceKey": KEY, "sgId": SG_ID, "sgTypecode": tc,
        "cnddtId": huboid, "numOfRows": 10, "pageNo": 1,
    })
    url = f"{BASE}?{qs}"
    body = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                body = r.read().decode("utf-8")
            break
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            time.sleep(1.2 * (attempt + 1))
    if not body:
        return []
    m = re.search(r"<prmsCnt>(\d+)</prmsCnt>", body)
    n = min(int(m.group(1)), 5) if m else 0
    out = []
    for i in range(1, n + 1):
        realm = _grab(body, "prmsRealmName", i)
        title = _grab(body, "prmsTitle", i)
        cont = _grab(body, "prmmCont", i)
        if title or cont:
            out.append({"realm": realm, "title": title, "content": cont})
    return out


def main():
    real = json.loads(REAL.read_text(encoding="utf-8"))
    tasks = []
    for seg in ["governor", "mayor", "council", "superintendent"]:
        for c in real.get(seg, []):
            tc = tc_for(seg, c)
            hub = c.get("huboid")
            if tc and hub:
                tasks.append((c, hub, tc))
    total = len(tasks)
    print(f"대상 {total}명 공약 동기화 시작")

    done = [0]
    with_pledges = [0]

    def work(t):
        c, hub, tc = t
        p = fetch_pledges(hub, tc)
        c["pledges"] = p
        done[0] += 1
        if p:
            with_pledges[0] += 1
        if done[0] % 300 == 0:
            print(f"  {done[0]}/{total} (공약보유 {with_pledges[0]})")
        return 1

    with ThreadPoolExecutor(max_workers=10) as ex:
        list(ex.map(work, tasks))

    REAL.write_text(json.dumps(real, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"완료: {total}명 중 공약 보유 {with_pledges[0]}명 → {REAL}")


if __name__ == "__main__":
    main()
