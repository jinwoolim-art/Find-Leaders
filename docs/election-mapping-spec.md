# Election Candidate Mapping Spec

**Audience**: Backend / data engineer integrating Korean Election Commission OpenAPI into A-Dashboard.

**Goal**: Given a citizen's residential address (province / city·district / sub-district), return all candidates running in elections that this citizen can vote in.

**Why this is non-trivial**: Korean administrative boundaries do **not** map 1:1 to electoral districts. Some elections use province-level districts, others use city-level, and some (provincial council members, municipal council members) sub-divide a city into multiple electoral districts that must be matched against the citizen's *sub-district* (행정동), not just city.

---

## 1. Korean administrative address standard

A residential address has 3 hierarchical levels:

| Level | Korean term | Count | Examples |
|---|---|---|---|
| 1 (province) | 시·도 (sido) | 17 | 서울특별시, 경기도, 부산광역시, 세종특별자치시 |
| 2 (city/county/district) | 시·군·구 (sigungu) | 226 | 강남구, 수원시, 안동시, 양양군 |
| 3 (sub-district) | 읍·면·동 (eupmyeondong / dong) | ~3,500 | 청담동, 역삼1동, 서운면 |

A-Dashboard's address picker (province / city·district / sub-district dropdowns) uses this standard.

> Reference data: 행정안전부 행정표준코드 (Ministry of the Interior and Safety - Standard Administrative Codes), available on data.go.kr.

---

## 2. Election types and electoral districts (2026 local election)

Each citizen votes in **5 elections simultaneously** in the local election. Each election has its own *electoral district granularity*:

| Election type | API code (`sgTypecode`) | Electoral district unit | Count | Citizen-facing name (example) |
|---|---|---|---|---|
| Provincial governor / Mayor of metropolitan city | **3** | sido (level 1) | 17 | 서울시장 (Mayor of Seoul) |
| Education superintendent | **9** | sido (level 1) | 17 | 서울 교육감 |
| Mayor / County head / District head | **4** | sigungu (level 2) | 226 | 강남구청장 (Gangnam-gu District Head) |
| Provincial council member (regional) | **5** | electoral district\* | ~700 | 서울 강남구 제1선거구 (Gangnam-gu District 1) |
| Municipal council member (regional) | **7** | electoral district\* | ~1,000 | 강남구 가선거구 (Gangnam-gu District "Ga") |

> \* Provincial / municipal council electoral districts further subdivide a sigungu by population. The mapping from sub-district (level 3) to electoral district must be maintained as a **separate lookup table** — the API does not provide this.

We **exclude** proportional representation candidates. Use only regional candidate APIs.

---

## 3. API endpoints

Korean Election Commission OpenAPI (`apis.data.go.kr/9760000/PofelcddInfoInqireService`).

| Endpoint | Returns | Use? |
|---|---|---|
| `/getPofelcddRegistSttusInfoInqire` | **Official candidates** (후보자) — candidates registered in the official period | **Yes** (only one we use) |
| `/getPoelpcddRegistSttusInfoInqire` | Pre-election candidates (예비후보자) — party-internal nomination phase | **No** — these are not on citizen ballots |

For 2026 local election: official candidate registration **starts on 2026-05-13** and is fully populated by the registration deadline. Before 2026-05-13, this API returns `INFO-03` (no data) — that is normal. **Do not** fall back to the pre-election API because pre-election candidates are nominated internally by parties, not voted on by citizens.

### Required parameters

```
serviceKey   = <issued by data.go.kr>
sgId         = 20260603              (election ID = 2026-06-03 local election)
sgTypecode   = 3 | 4 | 5 | 7 | 9
sdName       = e.g. 서울특별시         (province name, full official name)
numOfRows    = 100
pageNo       = 1
_type        = json                  (still returns XML in some cases — handle both)
```

### Common pitfalls

1. `sgId=20240410` (2024 general election) returns `INFO-00` but with old data — make sure to use `20260603` for the 2026 local election.
2. `sdName=` (empty) returns `INFO-03` (no data). Always supply a full province name.
3. `sgTypecode` and `sgId` must be valid combinations. For local election (`20260603`), valid codes are **3, 4, 5, 7, 9**. Other codes return `INFO-03`.
4. Even `_type=json` may return XML (server bug / fallback). Parse both.

---

## 4. Response structure (verified 2026-05-05)

XML fields per `<item>`:

```xml
<num>1</num>                        <!-- result row number -->
<sgId>20260603</sgId>
<sgTypecode>3</sgTypecode>
<huboid>100153766</huboid>          <!-- candidate unique ID -->
<sggName>서울특별시</sggName>           <!-- electoral district name (varies by sgTypecode) -->
<sdName>서울특별시</sdName>             <!-- province (level 1) -->
<wiwName/>                          <!-- city/district (level 2), can be empty for sgTypecode=3,9 -->
<jdName>더불어민주당</jdName>           <!-- party name (or "무소속") -->
<name>김형남</name>                   <!-- candidate name (Korean) -->
<hanjaName>金炯男</hanjaName>          <!-- name in Hanja -->
<gender>남</gender>                  <!-- 남 | 여 -->
<birthday>19891108</birthday>        <!-- YYYYMMDD -->
<age>36</age>
<addr>서울특별시 성북구 아리랑로19길</addr>
<jobId>225</jobId>
<job>인권운동가</job>
<eduId>68</eduId>
<edu>고려대학교 정치외교학과 졸업</edu>
<career1>...</career1>
<career2>...</career2>
<regdate>20260203</regdate>          <!-- registration date YYYYMMDD -->
<status>등록</status>                 <!-- 등록 | 사퇴 | 등록무효 -->
```

### Electoral district name (`sggName`) pattern by election type

| `sgTypecode` | Election | `sggName` example | `sdName` | `wiwName` |
|---|---|---|---|---|
| 3 | Provincial governor | `서울특별시` | `서울특별시` | (empty) |
| 9 | Education superintendent | `서울특별시` | `서울특별시` | (empty) |
| 4 | Mayor / County head | `종로구` | `서울특별시` | `종로구` |
| 5 | Provincial council | `종로구제1선거구` | `서울특별시` | `종로구` |
| 7 | Municipal council | `강남구가선거구` (typical pattern) | `서울특별시` | `강남구` |

**Important**: `wiwName` is the city/district level (level 2). `sggName` for council elections includes the electoral district sub-identifier (e.g., `제1선거구`, `가선거구`).

### `status` filter

Always filter `<status>등록</status>` only. Skip `사퇴` (withdrawn), `등록무효` (registration void).

---

## 5. The matching algorithm

Given citizen address `(sido, sigungu, dong)`, return up to 5 candidate lists:

```
INPUT:  sido    = "서울특별시"
        sigungu = "강남구"
        dong    = "청담동"

────────────────────────────────────────────────────────────────
[1] Provincial governor (sgTypecode=3)
    → Filter: sdName == sido
    → e.g. all candidates running for 서울특별시 mayor

[2] Education superintendent (sgTypecode=9)
    → Filter: sdName == sido
    → e.g. all candidates running for 서울 교육감

[3] Mayor / District head (sgTypecode=4)
    → Filter: sdName == sido AND wiwName == sigungu
    → e.g. all candidates running for 강남구청장

[4] Provincial council (sgTypecode=5)
    → Filter: sdName == sido AND wiwName == sigungu
    → AND sggName == lookup(sido, sigungu, dong) in mapping table
    → e.g. for 청담동: 강남구제1선거구 (varies by dong)

[5] Municipal council (sgTypecode=7)
    → Same pattern as [4] with a separate mapping table.
────────────────────────────────────────────────────────────────
```

Steps [1]–[3] are direct administrative matches.
Steps [4] and [5] require an external **dong → electoral district** lookup.

---

## 6. Sub-district to electoral district mapping (the hard part)

The Election Commission **does not** provide a clean API for this mapping. It is published as PDF before each election ("선거구획정안") and you must build a CSV table.

### Recommended schema

```csv
sido,sigungu,dong,provincial_council_district,municipal_council_district
서울특별시,강남구,청담동,서울특별시 강남구 제1선거구,강남구 가선거구
서울특별시,강남구,압구정동,서울특별시 강남구 제1선거구,강남구 가선거구
서울특별시,강남구,역삼1동,서울특별시 강남구 제2선거구,강남구 나선거구
...
```

Approximate size: 3,500 dong rows × 2 mapping columns.

### How to build

1. Download the official electoral district map PDF for the 2026 local election from the Election Commission website (~1 PDF per province).
2. Parse the PDF (text extraction works for most; some have scanned images requiring OCR).
3. Validate against actual API responses by matching `wiwName` + electoral district names returned by the API.
4. Store as CSV in your repo, version-controlled.

### Alternative if mapping is too costly upfront

Let the citizen **manually pick their electoral district** when the dong has multiple electoral districts. Show all electoral districts in their sigungu and ask "which one is yours?" with a link to the Election Commission's official lookup tool. This is acceptable for v1; auto-matching is a v2 enhancement.

---

## 7. Implementation example (pseudocode)

```ts
async function getCandidatesForCitizen(addr: { sido: string; sigungu: string; dong: string }) {
  const provincialDistrict = mappingTable.lookup(addr, 'provincial');
  const municipalDistrict  = mappingTable.lookup(addr, 'municipal');

  const calls = [
    { code: 3, filter: { sdName: addr.sido } },
    { code: 9, filter: { sdName: addr.sido } },
    { code: 4, filter: { sdName: addr.sido, wiwName: addr.sigungu } },
    { code: 5, filter: { sdName: addr.sido, wiwName: addr.sigungu, sggName: provincialDistrict } },
    { code: 7, filter: { sdName: addr.sido, wiwName: addr.sigungu, sggName: municipalDistrict  } },
  ];

  const results = await Promise.all(calls.map(({ code, filter }) =>
    fetchCandidates({ sgTypecode: code, sgId: 20260603, sdName: filter.sdName })
      .then(items => items.filter(it =>
        it.status === '등록' &&
        (!filter.wiwName || it.wiwName === filter.wiwName) &&
        (!filter.sggName || it.sggName === filter.sggName)
      ))
  ));

  return {
    provincialGovernor:        results[0],
    educationSuperintendent:   results[1],
    mayor:                     results[2],
    provincialCouncilMember:   results[3],
    municipalCouncilMember:    results[4],
  };
}
```

---

## 8. Caching and rate limits

- API daily quota: **10,000 calls per day** per service key.
- For ~9,000 active candidates and 5 election types, a daily cron syncing all data into your own database costs ~85 calls (5 election types × 17 provinces). Way below quota.
- **Recommendation**: nightly cron syncs everything into a Postgres table; serve citizen requests from your own database, not directly from the OpenAPI. This also eliminates client-side complexity.

```sql
CREATE TABLE election_candidates (
  huboid           TEXT PRIMARY KEY,
  sg_id            TEXT NOT NULL,
  sg_typecode      INT  NOT NULL,
  sgg_name         TEXT NOT NULL,
  sd_name          TEXT NOT NULL,
  wiw_name         TEXT,
  party            TEXT,
  name             TEXT NOT NULL,
  gender           TEXT,
  birthday         DATE,
  age              INT,
  addr             TEXT,
  job              TEXT,
  edu              TEXT,
  career1          TEXT,
  career2          TEXT,
  regdate          DATE,
  status           TEXT NOT NULL,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_lookup ON election_candidates (sd_name, wiw_name, sg_typecode, status);
```

---

## 9. Timeline for 2026 local election

Use **only** the official candidate API throughout. Pre-election candidates are not on citizen ballots and must be excluded.

| Date | API state | Action |
|---|---|---|
| Until 2026-05-12 | Empty (`INFO-03`) | Code path returns 0 candidates — UI shows mock data only |
| **2026-05-13 onwards** | Candidates begin to populate | Daily cron fetches the latest data |
| Election day 2026-06-03 | Final list locked | Continue serving from local DB |

`status` filter: only `등록` (registered). Skip `사퇴` (withdrawn) and `등록무효` (void).

---

## 10. Authentication and security

- Service key is issued via data.go.kr. Although classified as public data, treat it like a credential — exposing it allows others to consume your daily quota.
- Store in backend env (`DATA_GO_KR_API_KEY`). Never embed in client code.
- If exposed, regenerate via data.go.kr → My Page → Service key reissue (1 minute).

---

## 11. Open questions for A-Dashboard team

1. Will A-Dashboard host the dong → electoral district mapping CSV, or should the AI server provide it via API?
2. Does A-Dashboard already have an address standardization pipeline (e.g., 도로명주소 API) for citizen input?
3. Should we expose a "candidate sync trigger" endpoint for manual refresh during the candidate registration period (5/25–6/13), or is daily-only sufficient?

End of spec.
