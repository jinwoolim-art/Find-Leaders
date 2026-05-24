#!/usr/bin/env python3
"""선관위 OpenAPI에서 본 후보자 등록 명단을 받아 V3 candidate 형식으로 변환.

사용:
    DATA_GO_KR_API_KEY=xxx python3 scripts/sync-candidates.py
    또는 인자로:
    python3 scripts/sync-candidates.py <API_KEY>

출력: assets/candidates-real.json
"""

import os
import sys
import json
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime

API_BASE = (
    "https://apis.data.go.kr/9760000/PofelcddInfoInqireService/"
    "getPofelcddRegistSttusInfoInqire"  # 본 후보자 등록 (예비후보자 X)
)
SG_ID = "20260603"

SIDOS = [
    # 2026 행정구역 개편 반영:
    #   - 광주광역시 + 전라남도 → 전남광주통합특별시 (통합)
    #   - 인천: 중구·동구 폐지, 검단·영종·제물포구 신설 (wiwName 단위)
    # NEC API가 데이터를 옛 sdName(광주광역시/전라남도) + 새 sdName(전남광주통합특별시)에
    # 분산 저장 중이라 양쪽 다 호출해야 mayor 데이터까지 누락 없이 받음.
    # 받은 후 SIDO_NORMALIZE로 옛 sdName을 통합특별시로 정규화.
    "서울특별시", "부산광역시", "대구광역시", "인천광역시",
    "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원특별자치도", "충청북도", "충청남도",
    "전북특별자치도", "전라남도", "전남광주통합특별시",
    "경상북도", "경상남도", "제주특별자치도",
]

# 후처리: 옛 sdName → 통합 sdName으로 정규화 (voice.html 매칭 단순화)
SIDO_NORMALIZE = {
    "광주광역시": "전남광주통합특별시",
    "전라남도":   "전남광주통합특별시",
}

# sgTypecode → V3 candidateData 키
# NEC CommonCodeService 검증(2026-05-19): 7=비례국회의원, 9=기초의원비례 → 사용 X.
# 지역구 구·시·군의원=6, 교육감=11. 비례(8·9)는 컨셉상 제외.
TYPE_KEY = {
    3:  "governor",        # 시·도지사
    4:  "mayor",           # 구·시·군의 장
    5:  "council",         # 시·도의원 (지역구) — V3 council 배열에 통합
    6:  "council",         # 구·시·군의원 (지역구)
    11: "superintendent",  # 교육감
}

# 정당별 partyKey + V3 colorClasses 키 매핑.
PARTY_KEY = {
    "더불어민주당":   ("democratic",  "blue"),    # 파랑
    "국민의힘":       ("peoples",     "red"),     # 빨강
    "정의당":         ("justice",     "yellow"),  # 노랑
    "녹색당":         ("green",       "green"),   # 초록
    "진보당":         ("progress",    "purple"),  # 보라
    "기본소득당":     ("basic",       "teal"),    # 민트
    "시대전환":       ("new_era",     "orange"),  # 주황
    "무소속":         ("independent", "gray"),    # 회색
}
DEFAULT_PARTY = ("other", "gray")  # 위에 없는 정당 (개혁신당·조국혁신당·국민연합 등)


def fetch(code: int, sd: str, key: str):
    """한 (선거종류, 시·도) 조합의 후보자 전체를 페이지네이션으로 받는다.

    시·도의원/구시군의원은 한 시·도에 500명을 넘을 수 있어 전 페이지를 순회한다.
    """
    rows = 500
    page = 1
    out = []
    while True:
        qs = urllib.parse.urlencode({
            "serviceKey": key,
            "sgId": SG_ID,
            "sgTypecode": code,
            "sdName": sd,
            "numOfRows": rows,
            "pageNo": page,
            "resultType": "json",
        })
        url = f"{API_BASE}?{qs}"
        body = None
        for attempt in range(4):  # 502/타임아웃 등 일시적 오류 재시도
            try:
                with urllib.request.urlopen(url, timeout=30) as r:
                    body = r.read().decode("utf-8")
                break
            except (urllib.error.HTTPError, urllib.error.URLError,
                    TimeoutError) as e:
                if attempt == 3:
                    print(f"  ⚠️  요청 실패 tc={code} sd={sd} page={page}: {e}",
                          file=sys.stderr)
                    return out
                time.sleep(1.5 * (attempt + 1))
        try:
            d = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            break
        b = d.get("response", {}).get("body", {})
        items = b.get("items", {})
        items = items.get("item", []) if isinstance(items, dict) else []
        if isinstance(items, dict):
            items = [items]
        out.extend(items)
        try:
            total = int(b.get("totalCount") or 0)
        except (TypeError, ValueError):
            total = 0
        # 종료는 실제 누적 수신량 기준 (API가 numOfRows보다 적게 줄 수 있음).
        if not items or len(out) >= total or page >= 60:
            break
        page += 1
    return out


def to_v3(item: dict, code: int) -> dict:
    """OpenAPI item → V3 candidate 형식."""
    party_name = item.get("jdName") or "무소속"
    pk, pcolor = PARTY_KEY.get(party_name, DEFAULT_PARTY)

    name = item.get("name") or ""
    age = item.get("age")
    addr = item.get("addr") or ""

    # birthplace = 주소에서 시·도 + 시·군·구만
    birthplace_parts = addr.split()
    birthplace = " ".join(birthplace_parts[:2]) if len(birthplace_parts) >= 2 else addr

    careers = []
    if item.get("career1"):
        careers.append({"year": "", "title": item["career1"]})
    if item.get("career2"):
        careers.append({"year": "", "title": item["career2"]})

    # huboid를 V3 ID로 — 가상 ID(1~999)와 충돌 안 나게 prefix
    huboid = item.get("huboid") or ""
    v3_id = f"nec_{huboid}" if huboid else f"nec_{name}_{code}"

    # giho = 선거기호. 비례대표(추천순위)·교육의원은 빈 값일 수 있어 그땐 None.
    giho = str(item.get("giho") or "").strip()
    number = int(giho) if giho.isdigit() else None

    return {
        "id": v3_id,
        "huboid": huboid,
        "name": name,
        "age": int(age) if age and str(age).isdigit() else None,
        "party": party_name,
        "partyKey": pk,
        "partyColor": pcolor,
        "number": number,
        "slogan": "",
        "sido": item.get("sdName") or "",
        "sggName": item.get("sggName") or "",
        "wiwName": item.get("wiwName") or "",
        "likes": 0,
        "greeting": "",
        "career": careers,
        "achievements": [],
        "education": item.get("edu") or "",
        "birthplace": birthplace,
        "gender": item.get("gender") or "",
        "regdate": item.get("regdate") or "",
        "status": item.get("status") or "",
        "_source": "NEC",
        "policies": {
            "summary": "",
            "jobs": "",
            "vision": "",
            "education": "",
        },
    }


def main():
    key = (
        os.environ.get("DATA_GO_KR_API_KEY")
        or (sys.argv[1] if len(sys.argv) > 1 else None)
    )
    if not key:
        print("ERROR: API key required (env DATA_GO_KR_API_KEY or first arg)",
              file=sys.stderr)
        sys.exit(1)

    out = {
        "_lastSynced": datetime.now().isoformat(timespec="seconds"),
        "_source": API_BASE,
        "_sgId": SG_ID,
        "governor": [],
        "mayor": [],
        "council": [],
        "superintendent": [],
    }

    # 광주·전남은 NEC가 '전남광주통합특별시'로 통합 → tc 3·5·11에서 두 시도명이
    # 동일 명단을 반환한다. huboid(=id) 기준으로 중복을 제거한다.
    seen_ids = set()
    for code, key_name in TYPE_KEY.items():
        for sd in SIDOS:
            items = fetch(code, sd, key)
            for it in items:
                if it.get("status") != "등록":
                    continue
                cand = to_v3(it, code)
                if cand["id"] in seen_ids:
                    continue
                seen_ids.add(cand["id"])
                out[key_name].append(cand)

    # 후처리: 옛 sdName(광주광역시/전라남도) → 전남광주통합특별시로 정규화
    # NEC API가 mayor 데이터를 옛 표기로 유지하고 있어 받은 후 통일.
    for k in ["governor", "mayor", "council", "superintendent"]:
        for c in out[k]:
            s = c.get("sido", "")
            if s in SIDO_NORMALIZE:
                c["sido"] = SIDO_NORMALIZE[s]

    # 정렬 — 시·도 → 시·군·구 → 정당 → 이름
    for k in ["governor", "mayor", "council", "superintendent"]:
        out[k].sort(key=lambda x: (
            x.get("sido", ""),
            x.get("wiwName", "") or x.get("sggName", ""),
            x.get("party", ""),
            x.get("name", ""),
        ))

    target = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "assets", "candidates-real.json",
    )
    with open(target, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved → {os.path.relpath(target)}")
    print(f"   governor:       {len(out['governor'])} 명")
    print(f"   mayor:          {len(out['mayor'])} 명")
    print(f"   council:        {len(out['council'])} 명")
    print(f"   superintendent: {len(out['superintendent'])} 명")
    print(f"   합계:           {sum(len(out[k]) for k in ['governor','mayor','council','superintendent'])} 명")


if __name__ == "__main__":
    main()
