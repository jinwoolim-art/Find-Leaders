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
import urllib.parse
import urllib.request
from datetime import datetime

API_BASE = (
    "https://apis.data.go.kr/9760000/PofelcddInfoInqireService/"
    "getPoelpcddRegistSttusInfoInqire"
)
SG_ID = "20260603"

SIDOS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시",
    "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원특별자치도", "충청북도", "충청남도",
    "전북특별자치도", "전라남도", "경상북도", "경상남도",
    "제주특별자치도",
]

# sgTypecode → V3 candidateData 키
TYPE_KEY = {
    3: "governor",        # 광역단체장 (시·도지사)
    4: "mayor",           # 기초단체장 (구·시·군의 장)
    5: "council",         # 광역의원 (시·도의원) — V3 council 배열에 통합
    7: "council",         # 기초의원 (5/13 이후)
    9: "superintendent",  # 교육감 (5/13 이후)
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
    qs = urllib.parse.urlencode({
        "serviceKey": key,
        "sgId": SG_ID,
        "sgTypecode": code,
        "sdName": sd,
        "numOfRows": 500,
        "pageNo": 1,
        "resultType": "json",
    })
    url = f"{API_BASE}?{qs}"
    with urllib.request.urlopen(url, timeout=30) as r:
        body = r.read().decode("utf-8")
    try:
        d = json.loads(body)
    except json.JSONDecodeError:
        return []
    items = (d.get("response", {}).get("body", {})
              .get("items", {}).get("item", []))
    if isinstance(items, dict):
        items = [items]
    return items


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

    return {
        "id": v3_id,
        "huboid": huboid,
        "name": name,
        "age": int(age) if age and str(age).isdigit() else None,
        "party": party_name,
        "partyKey": pk,
        "partyColor": pcolor,
        "number": None,  # 기호는 본 후보 등록 후에 부여
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

    counts = {}
    for code, key_name in TYPE_KEY.items():
        for sd in SIDOS:
            items = fetch(code, sd, key)
            for it in items:
                if it.get("status") != "등록":
                    continue
                out[key_name].append(to_v3(it, code))
        counts[code] = sum(1 for x in out[key_name] if x.get("status") == "등록")

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
