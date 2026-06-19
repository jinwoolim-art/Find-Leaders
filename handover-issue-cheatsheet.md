# Issue Cheatsheet — 인수 후 즉시 처리 작업

Lo Hi 인수인계서와 비교용. 우리가 발견한 이슈 + 해결 방향 모음.

---

## 🔴 P0 — 가장 시급

### 1. sgTypecode 매핑 정정 (Lo Hi 코드 + Schema)

**상태**: Lo Hi가 `7·9` 사용 중. NEC API 실제 검증 결과 `6·11`이 정답.

| 잘못 (Lo Hi) | 정답 | 의미 |
|---|---|---|
| `sgTypecode=7` | `sgTypecode=6` | 구·시·군의원 |
| `sgTypecode=9` | `sgTypecode=11` | 교육감 |

**수정 위치**:
```ts
// nec.config.ts
NEC_IMPORT_TYPECODES = '3,4,5,6,11'   // was '3,4,5,7,9'

// nec-importer.service.ts (NEC_TYPE_LABELS or similar)
const NEC_TYPE_LABELS = {
  '3':  '시·도지사',
  '4':  '구청장·시장·군수',
  '5':  '시·도의원',
  '6':  '구·시·군의원',     // was '7'
  '11': '교육감',           // was '9'
};

// ElectionType seed
{ code: 'nec-3', name: '시·도지사' }
{ code: 'nec-4', name: '구청장·시장·군수' }
{ code: 'nec-5', name: '시·도의원' }
{ code: 'nec-6', name: '구·시·군의원' }   // was 'nec-7'
{ code: 'nec-11', name: '교육감' }         // was 'nec-9'
```

**DB 마이그레이션 필요**:
- 기존 `nec-7` ElectionType 사용 중인 candidate들을 어떻게 처리할지
  - Option A: 옛 nec-7 row 그대로 두고 신규 nec-6 만들고 NEC 재import (cleaner)
  - Option B: 옛 nec-7 row 의 code/name을 nec-6으로 update (in-place)

→ Option A 추천. 옛 nec-7 row는 어차피 NEC에 매칭 안 됨 (실제 NEC sgTypecode=7 = 0건).

---

### 2. NEC API endpoint 정정 (이전 메시지에서 알림)

```ts
// nec-api.client.ts
- BASE = 'https://apis.data.go.kr/9760000/PofelcddInfoInqireService/getPoelpcddRegistSttusInfoInqire'   // 예비후보
+ BASE = 'https://apis.data.go.kr/9760000/PofelcddInfoInqireService/getPofelcddRegistSttusInfoInqire'   // 본후보
```

한 글자: `Poelpcdd` → `Pofelcdd`. Lo Hi가 5/15에 본 INFO-03이 이거 때문.

---

### 3. 광주/전남 통합 처리

**NEC가 통합 운영**:
- sgTypecode=3 (시·도지사): 광주 후보 = 전남 후보 동일
- sgTypecode=5 (시·도의원): 광주 후보 = 전남 후보 동일

Lo Hi 방식: **importer 내부 routing 수정** (Lo Hi가 자기 코드로 알아서 해결 중).

상태: Lo Hi가 진행 중. 우리는 검증만.

검증 케이스 (5/16 후 NEC 완전 노출 후):
- 광주광역시 / 동구 / 충장동 + electionType=시·도지사 → 5명 (민형배 등)
- 전라남도 / 함평군 / 유치면 + electionType=시·도지사 → 같은 5명 나와야

---

## 🟡 P1 — Day 1~2 안에

### 4. 누락된 ElectoralDistrict 채우기

**누락 목록** (5/15 비교 결과):
- 충남 서산시 (시·도의원) — 제1/2/3선거구 6명
- 경기 교육감 — 용인시, 안성시, 양평군, 동두천시 7명
- 충남 교육감 — 보령시, 아산시, 서산시 7명

**해결**:
1. 우리 master CSV에 서산시 시·도의원 다 있음 → re-run M4 seed
2. 교육감은 province-only → 시·도 단위만 매핑, sigungu 매핑 필요 X (Lo Hi schema 수정)

**우리 master.csv 위치**:
```
/Users/jin-woolim/Desktop/2026년 지방선거 선거구/_통합결과/선거구_통합_master.csv
```

컬럼: `sgTypecode | sdName | sigunguName | sggName | seatCount | emdName`

⚠️ sgTypecode=7로 박혀있음 → **sgTypecode=6으로 정정 후 사용**.

---

### 5. Test avatars / Dummy 청소

**제거할 후보**:
```sql
-- "Candidate1 Avatar" / "TOM 아바타" (test data)
DELETE FROM candidate_profile WHERE userId IN (
  SELECT id FROM "user"
  WHERE displayName IN ('Candidate1 Avatar', 'TOM 아바타')
    AND necHuboid IS NULL
);
DELETE FROM "user"
 WHERE displayName IN ('Candidate1 Avatar', 'TOM 아바타')
   AND necHuboid IS NULL;
```

근데 TOM 아바타가 너 본인 거면 보존 결정 필요. 확인 후 진행.

**과거 dummy** (가평군 등) — Lo Hi가 어제 import 다시 돌리면서 자동 청소됐을 가능성. 검증 필요:
```sql
SELECT u.displayName, cp.party, p.nameKo
  FROM "user" u
  JOIN candidate_profile cp ON cp.userId = u.id
  JOIN province p ON p.id = cp.provinceId
 WHERE u.displayName IN ('신상진','신현철','이상일','이민근','전예슬','임완식','김영희','김귀근')
   AND u.necHuboid IS NOT NULL;
```
→ 행 없으면 청소 끝. 있으면 NEC 매칭되는지 huboid로 검증 (NEC에 그 huboid 후보 진짜 있나).

---

## 🟢 P2 — Day 2 이후

### 6. NEC 본후보자 완전체 재import

NEC가 5/16~17 이후 모든 sgTypecode 완전 노출. 그때 import 한 번 더 돌려서:
- typecode=6 (구·시·군의원) 데이터 새로 들어옴
- typecode=11 (교육감) 정확한 후보 들어옴
- 매칭율 90% → 99%+ 예상

### 7. 보안 — NEC API 키 재발급

너가 채팅에 키 평문 노출했었음. 그래도 NEC 키는 일일 한도 10K라 비용 청구 없음. 재발급 권장:
```
data.go.kr → 마이페이지 → 인증키 → 재발급
```

---

## 🔵 P3 — 향후

### 8. sgTypecode=9 정체 확인

NEC API에서 sgTypecode=9가 84명 반환 (서울). sggName=종로구 같은 sigungu 단위 + 정당 있음. 교육감 아님.

가능성:
- (a) 어떤 비례대표
- (b) 폐기된 카테고리
- (c) 임시 또는 특수 선거

NEC 활용가이드 PDF 확인 필요. 또는 NEC에 직접 문의.

지금은 무시 OK. 운영에 영향 없음.

### 9. sgTypecode=7 / 10 / 12 정체

다 INFO-03 (0건). 사용 안 하는 코드. 무시.

### 10. sgTypecode=8

서울 54명 반환. sggName=서울특별시, 정당 있음. **비례 시·도의원** 가능성 매우 높음.

도입 여부는 사용자/Lo Hi 결정. NEC 활용가이드 확인.

---

## 데이터 출처 / 검증 명령어

### NEC API 직접 호출 (인증키 .env에서 읽기)

```bash
# 시·도지사 서울 (sgTypecode=3) — 정상이면 5~6명
curl "https://apis.data.go.kr/9760000/PofelcddInfoInqireService/getPofelcddRegistSttusInfoInqire?serviceKey=$KEY&sgId=20260603&sgTypecode=3&sdName=서울특별시&numOfRows=10&pageNo=1&_type=xml"

# 구·시·군의원 서울 (sgTypecode=6) — 정상이면 582명
curl "https://apis.data.go.kr/9760000/PofelcddInfoInqireService/getPofelcddRegistSttusInfoInqire?serviceKey=$KEY&sgId=20260603&sgTypecode=6&sdName=서울특별시&numOfRows=10&pageNo=1&_type=xml"
```

### Production DB와 NEC 비교 스크립트 (Lo Hi가 만든 것)

```
ai-avatar-core/scripts/nec-vs-production-compare.mjs
```
→ 매칭률 / mismatch 리스트 보여줌. 재import 후 검증용.

---

## 한 번에 알 수 있는 작업 우선순위

| # | 작업 | 시간 | 누가 |
|---|---|---|---|
| 1 | NEC endpoint 정정 (Poelpcdd→Pofelcdd) | 1분 | 우리 또는 Lo Hi |
| 2 | sgTypecode 매핑 정정 (7→6, 9→11) | 30분 | 우리 PR |
| 3 | 광주/전남 통합 fix 배포 | 10분 | Lo Hi |
| 4 | 누락 선거구 채우기 (master.csv 재import) | 15분 | 우리 PR |
| 5 | TOM 아바타 등 dummy 청소 | 5분 | Lo Hi |
| 6 | 5/16 이후 NEC 재import + 검증 | 30분 | 우리 또는 Lo Hi |

→ 인수 후 첫 2일 안에 P0 + P1 다 처리. 운영 가능 수준.
