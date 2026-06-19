# 핸드오버 — 공약 카드 prefab·자산 마무리 작업

**대상:** 2펀 (한국 유니티 디자이너)
**작성:** 탐 (with Claude 분석)
**저장소:** `ai-avatar-endpoint` (Unity)
**브랜치:** `Tam` (혹은 머지 후 `Dev-OnGoing`)
**예상 소요:** 두 작업 합쳐 30분 이내

---

## 0. 현재 상태 한 줄 요약

코드 측은 **백엔드의 `categoryNormalized` / `keyword` 수신 + 한국어 라벨 조립 + 6 enum 분류 매퍼 + 인사말 빈 박스 5칸 + 주요 성과 빈 placeholder** 까지 모두 완료. **상세보기 모달 열림 정상 동작 확인됨.**

남은 두 가지:

1. **공약 카드의 "분류 / 소분류" 텍스트가 흰색이라 카드 배경에 묻혀 안 보임** → prefab TMP Color 수정
2. **공약 아이콘이 카테고리별로 안 바뀌고 일반 문서 모양** → `CandidateManagerData.asset` 의 sprite 매핑 추가

둘 다 자산 영역이라 코드로 우회 안 함 (이전 코드 우회 시도가 다른 화면에 영향 줘서 모두 revert함).

---

## 작업 1 — 공약 카드 분류 라벨 TMP 색상 수정 (3 prefab)

### 왜 필요?

코드는 정확히 `"주거와 교통 / 주택1"` 같은 라벨을 `pledgeCategoryText.text` 에 넣고 있음 (`PledgeMapper.BuildPledgeLabel` 결과). 하지만 prefab 의 TMP `m_Color` 가 **순백(#FFFFFF)** 으로 설정돼 있어, 카드의 연한 배경 위에 흰 글자 = 보이지 않음.

prefab YAML 직접 확인 결과 (`Assets/Scripts/UIPages/AvatarPlegePage/Prefab/PledgePrefab.prefab` 의 `pledgeCategoryText` 컴포넌트):
```yaml
m_Color: {r: 1, g: 1, b: 1, a: 1}   ← 이 값을 어둡게
```

### 수정할 prefab 3개

| # | 파일 | 안의 GameObject | TMP 컴포넌트 |
|---|---|---|---|
| 1 | `Assets/Scripts/UIPages/AvatarPlegePage/Prefab/PledgePrefab.prefab` | `Category` (자식 GameObject) | `pledgeCategoryText` SerializeField |
| 2 | `Assets/Prefabs/MainMenu/PledgeDetailPopUp.prefab` | (모달 안의 분류 텍스트 영역) | `pledgeCategoryText` SerializeField |
| 3 | (비교페이지 카드 prefab — find 명령으로 찾기: `find Assets -name "*Compare*" -name "*.prefab"`) | (분류 텍스트 영역) | `categoryText` SerializeField |

### 작업 절차

각 prefab 별로:

1. Unity 에디터에서 prefab 더블클릭 → Prefab 편집 모드 진입
2. Hierarchy 에서 `Category`(또는 분류 텍스트 표시하는 GameObject) 선택
3. Inspector → TextMeshPro - Text (UI) 컴포넌트
4. **Color 슬라이더 클릭** → 색상 picker 열기
5. **HEX 입력**: `4D4D66` (어두운 블루그레이) — 또는 `333333`/`555555` 같은 신경성 그레이도 가능
6. Alpha = 255 유지
7. Save Prefab

### 검증

- Play 모드 진입
- NEC 임포트 후보자 (예: 권영국, 추경호) 의 후보자 상세 → 핵심공약 탭 진입
- 각 카드의 제목 위 또는 아이콘 옆에 **"주거와 교통 / 주택1"**, **"복지와 보건 / 복지"** 같은 라벨이 보이면 성공

---

## 작업 2 — 공약 아이콘 SpriteRepository 매핑 추가

### 왜 필요?

코드는 `pledge.CategoryEnum` 으로 카테고리 enum 을 정확히 산출하고 (`PledgeMapper.ToCategoryFromNormalized` + `DeriveCanonicalCategoryFromRaw` 폴백), `CandidateManager.GetPledgesCategorySprite(category)` 를 호출함. 이 함수는 결국:

```csharp
candidateManagerData.pledgesCategorySprites.Get(category.ToString())
```

→ `SpriteRepository.Get("HousingAndTransport")` 같은 호출.

하지만 `_repo` 리스트에 **6개 enum 이름이 매핑되어 있지 않아** `Resources.Load<Sprite>("RepositoryDummy")` 폴백 sprite 가 모든 카드에 표시되는 중 (현재 보이는 일반 문서 아이콘).

### 수정할 자산

`Assets/Scripts/CandidateManager/SO/CandidateManagerData.asset`

### 추가할 매핑 7건

| Name (정확히 이대로, 대소문자 보존) | Sprite (2번님 디자인) | 의미 |
|---|---|---|
| `EconomyAndJobs` | 가방·동전·차트 류 | 경제와 일자리 |
| `HousingAndTransport` | 집·자동차·길 | 주거와 교통 |
| `WelfareAndHealth` | 하트·맥박·돕는 손 | 복지와 보건 |
| `EducationAndChildcare` | 학사모·책 | 교육과 돌봄 |
| `Environment` | 잎·나무 | 환경 |
| `Safety` | 방패·체크 | 안전 |
| `Unknown` (옵션) | 무난한 아이콘 | 폴백 — 없으면 `RepositoryDummy` 가 폴백 |

### 작업 절차

1. Unity 에디터 → Project 창에서 `Assets/Scripts/CandidateManager/SO/CandidateManagerData.asset` 선택
2. Inspector 에서 `Pledges Category Sprites` 항목 펼치기 (그 안에 `_repo` 가 있음)
3. `_repo` Size 를 현재값 + 7 로 늘림 (또는 + 6 이면 Unknown 제외)
4. 새로 생긴 빈 슬롯에 각각:
   - **Name**: 표의 정확한 영문 enum 이름 입력 (대소문자 그대로 — `EconomyAndJobs` 등)
   - **sprite**: 2번님이 만든/고른 아이콘 sprite 드래그
5. Save (Cmd+S)

### 아이콘 디자인 가이드

탐 요청: **작고 단순한 형태** (lucide 스타일 line icon 또는 단색 silhouette). 너무 디테일하면 카드의 작은 영역에서 안 읽힘.

- 권장 크기: **24~32px**, 정사각형
- 색: 단색 (TMP 의 색상 tint 가 적용되므로 sprite 자체는 흰색이나 회색 단색 권장)
- 라인 두께: 1.5~2px
- 배경: 투명 (PNG 또는 SVG)

### 검증

- Play 모드 진입 → 후보자 상세 → 핵심공약 탭
- 권영국 (정의당) 의 공약 5개 카드 각각의 아이콘이:
  - "주거 교통 외료 먹거리..." → **HousingAndTransport** sprite
  - "돌봄의 무게를 덜고..." → **WelfareAndHealth** sprite
  - 등 카테고리별로 다른 아이콘이 보이면 성공

---

## 작업 3 (선택) — 인사말 빈 박스 ContentSizeFitter 정리

### 현재 상태

인사말 빈 칸 5줄 높이는 **코드로 강제 중** (`AvatarPlegePageGreetingUI.cs` 에서 `RectTransform.sizeDelta` + `LayoutElement.minHeight/preferredHeight` = 140px). 정상 작동.

### 더 깨끗한 마무리 (필요 시)

`AvatarPlegePage.prefab` 안 `descriptionObject` 에:
- `Content Size Fitter` 컴포넌트 추가, `Vertical Fit = PreferredSize`
- 또는 `LayoutElement.minHeight = 140` 으로 prefab 자체에 박아두기

이렇게 prefab 으로 옮기면 `AvatarPlegePageGreetingUI.cs` 의 런타임 코드 우회를 제거할 수 있음 (탐에게 알려주면 코드 정리해드림).

**우선순위 낮음 — 현재 작동하니까 출시 후 정리해도 OK.**

---

## 작업 완료 후 — 탐에게 알려주실 것

작업 1, 2 끝나면 다음 한 줄만 회신 부탁드립니다:

> "prefab 색·sprite 매핑 끝. 검증해보니 카드 라벨/아이콘 모두 정상 노출됨."

탐이 받으면:
- 출시 대상 후보자 상세 화면 검증 완료 처리
- 인사말 prefab 정리 (작업 3) 진행 여부 결정

---

## 만약 막히면

| 증상 | 진단 / 해결 |
|---|---|
| TMP 컴포넌트가 안 보임 | Inspector 상단 우측 점 3개 → Component → Add → TextMeshPro - Text (UI). 단 prefab 의 TMP 가 이미 있을 가능성이 큼, 자식 GameObject 잘못 골랐을 수 있음 |
| Color 슬라이더가 회색으로 잠겨있음 | prefab 편집 모드 미진입. 더블클릭으로 진입 |
| Sprite 매핑 후 여전히 RepositoryDummy 가 뜸 | Name 오타 가능성 가장 높음 — 대소문자 정확히 `HousingAndTransport` (Hyphen 없음, 띄어쓰기 없음) |
| 카드 라벨 색 바꿨는데 여전히 안 보임 | TMP 의 **Material Preset** 이 white 로 override 중일 수 있음. Material Preset 도 확인 |
| 모든 작업 후 아무 변화 없음 | Unity 재컴파일/재실행. 정 안 되면 `Library/` 폴더 삭제 후 재import |

---

## 참고 — 이 작업 전에 코드 측에서 한 일 (이미 적용됨, 추가 작업 불필요)

| 영역 | 코드 측 작업 | 상태 |
|---|---|---|
| 백엔드 신필드 수신 | `Pledge` 모델에 `categoryNormalized`, `keyword` 추가 | ✅ |
| 카테고리 enum 매핑 | `PledgeMapper.ToCategoryFromNormalized` + `DeriveCanonicalCategoryFromRaw` (한글 prefix 폴백) | ✅ |
| 라벨 조립 | `PledgeMapper.BuildPledgeLabel` (한국어 라벨 하드코딩 + null-safe) | ✅ |
| list/모달/비교 3 surface 일원화 | `PledgeMapper.BuildPledgeLabel(pledge)` 호출로 통일 | ✅ |
| 인사말 빈 칸 5줄 | 런타임 RectTransform + LayoutElement 강제 | ✅ |
| 주요 성과 빈 placeholder 2칸 | `Achievement.content = ""` 인스턴스 2개 | ✅ |
| 상세보기 모달 열림 | b9add83 상태로 복귀, 작동 확인됨 | ✅ |
