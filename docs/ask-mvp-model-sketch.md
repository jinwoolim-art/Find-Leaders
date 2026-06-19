# ASK MVP — 도메인 모델 & 분리 계획 스케치

작성: 2026-05-26
상태: **Phase 0 — 모델 스케치(코드 작업 전)**

## 1. ASK 정의

지역 기반으로 사용자가 전문가·업체·기관에 질문하고 상담받는 범용 Q&A/상담 플랫폼. 일꾼을묻다의 RAG·아바타·결제·인증 인프라를 그대로 가져가고, 후보자(candidate) 도메인을 전문가/업체(provider) 도메인으로 치환.

**MVP 범위**:
- 카테고리 + 지역으로 전문가 검색
- 전문가 프로필(자격·자료) 열람
- AI 챗(전문가 지식 베이스 기반 RAG 응답) — 토큰 차감
- 카카오/애플 로그인
- 결제(토큰 충전)
- 관리자: 전문가 검수·승인

**v2 이후로 미루는 것**: 1:1 라이브 상담 예약, 후기/평점, AI 아바타 영상(SaaS 또는 자체 웹 네이티브), 정산.

**Unity 결정 (2026-05-26 확정)**: ASK는 Unity 아바타 미사용. 일꾼 Unity는 부자연스러움으로 사실상 포기 상태. ASK 성공 후 옵션으로 부착 가능성만 열어둠. ai-avatar-endpoint(Unity) 디렉토리는 ASK fork에서 가져오지 않음. Avatar 엔티티는 RAG 지식 베이스 단위로만 의미 재정의. realtime WebSocket 모듈은 dead.

---

## 2. 핵심 엔티티 (12개)

### 신규 또는 재설계 (5개)

| 엔티티 | 역할 | 출처 |
|---|---|---|
| `User` | 시민/전문가 공통 계정 | 기존 재사용 (election 필드 제거) |
| `ProviderProfile` | 전문가/업체 프로필 | `CandidateProfile` 자리 재설계 |
| `Category` | 전문 분야(의료/법무/세무/부동산/IT/교육 등) | 신규 |
| `ProviderCategory` | 전문가↔카테고리 N:M | 신규 |
| `Question` | 사용자 질문(세션 단위) | 신규 (ChatTurn 위에 얇게) |

### 그대로 재사용 (7개)

| 엔티티 | 역할 |
|---|---|
| `Province` / `Sigungu` / `Emd` | 지역 계층 — 선거구 의존성 없음, 그대로 사용 |
| `Avatar` / `AvatarKnowledge` / `AvatarKnowledgeChunk` | RAG 지식 베이스. `ownerUserId`로 단순 rename |
| `TokenBalance` / `TokenTransaction` / `TokenPlan` | 토큰 — 이미 User 중심 |
| `PaymentTransaction` | 결제 — 이미 User 중심 |
| `ChatTurn` | 질문/답변 한 턴 — 그대로 |
| `SemanticCache` | RAG 캐시 — 도메인 무관 |
| `ClientGeoAddress` | 사용자 지역 |

### 제거 (8개)

`ElectionType`, `ElectoralDistrict*`(3개), `CandidateProfilePledge/Education/Career/Achievement/Bio`(MVP는 ProviderProfile에 단순화), `NecImportReport`.

---

## 3. 일꾼을묻다 → ASK 매핑

| 일꾼을묻다 | ASK |
|---|---|
| 선거 유형(대통령/시장/구의원 등) | 전문 분야 카테고리 |
| 선거구(ElectoralDistrict) | 지역(Province/Sigungu/Emd) — 그대로 |
| 후보자(Candidate) | 전문가/업체(Provider) |
| 공약(Pledge) | 서비스 소개 + 포트폴리오 |
| 사전 질문팩 130개 | 카테고리별 FAQ 시드 |
| 정당(Party) | 자격증/소속 기관 |
| NEC 임포트 | 사업자등록·전문가 자격 검증(수동/외부 API) |
| 아바타(공약 RAG) | 아바타(서비스 RAG) — 동일 |

---

## 4. ProviderProfile 필드 초안

```
ProviderProfile {
  id                uuid
  userId            FK → User (1:1)
  displayName       string         // 표시명
  businessName      string?        // 상호/법인명
  categoryIds       FK[] → Category (N:M via ProviderCategory)
  regionProvinceId  FK → Province  // 활동 지역
  regionSigunguId   FK → Sigungu?
  regionEmdId       FK → Emd?
  bio               text           // 자기소개
  introVideoUrl     string?
  licenses          jsonb          // [{type, number, issuer, verifiedAt}]
  contactPhone      string?
  contactEmail      string?
  websiteUrl        string?
  status            enum           // DRAFT | PENDING_REVIEW | APPROVED | REJECTED | SUSPENDED
  approvedAt        timestamp?
  approvedBy        FK → AdminUser?
  rejectionReason   text?
  createdAt/updatedAt
}
```

검수 흐름은 일꾼을묻다 아바타 검수와 동일(detail은 v2).

---

## 5. MVP 페이지 (7개)

| # | 페이지 | 출처 | 작업량 |
|---|---|---|---|
| 1 | 랜딩 | landing-final.html | 카피 교체(작은 손) |
| 2 | 카테고리·지역 검색 | ilgun-platform-v3 골격 | 데이터 스키마 교체(큰 손) |
| 3 | 전문가 상세 + AI 챗 | ilgun-platform-v3 `page-detail`+`page-chat` | 데이터 바인딩(중간) |
| 4 | 전문가 등록 폼 | candidate-event.html 골격 | 필드 재설계(중간) |
| 5 | 전문가 대시보드(자료 업로드/통계) | host-panel 골격 | rename + 카피(작은) |
| 6 | 결제/충전 | checkout.html | 패키지명 교체(작은) |
| 7 | 관리자 검수 | admin-dashboard.html 골격 | 통계 라벨 교체(작은) |

**버림**: NEC 임포트 UI, 선거구 매핑 UI, 사전 질문팩(130개) UI, district-avatar 일체(v2).

---

## 6. API 엔드포인트 매핑

| 일꾼을묻다 | ASK | 변경 종류 |
|---|---|---|
| `POST /v1/candidate/avatars` | `POST /v1/provider/avatars` | rename |
| `POST /v1/candidate/chat-history` | `POST /v1/provider/chat-history` | rename |
| `POST /v1/candidate/payment/*` | `POST /v1/provider/payment/*` | rename |
| `GET /v1/avatars` | `GET /v1/providers/:id/avatars` | path 정리 |
| `POST /v1/chat` | `POST /v1/chat` | 그대로 |
| `GET /v1/token-plans` | `GET /v1/token-plans` | 그대로 |
| `GET /api/panel/candidates` | `GET /api/panel/providers` | rename |
| `POST /api/panel/election-types` | — | 제거 |
| `POST /api/panel/nec-import` | — | 제거 |
| `POST /api/panel/providers/:id/review` | (신규, 검수) | 신규 |
| (신규) `GET /v1/categories` | 카테고리 목록 | 신규 |
| (신규) `GET /v1/providers?category=&province=&sigungu=` | 검색 | 신규 |

신규 컨트롤러 2개(`CategoryController`, `ProviderSearchController`) + 기존 컨트롤러 약 5개 rename.

---

## 7. 레포 구조 제안 (옵션 A)

```
GitHub/
├── Find-Leaders/          # 일꾼을묻다 (그대로 운영)
├── ai-avatar-core/        # 일꾼을묻다 백엔드 (사합과 공유, 그대로)
│
├── ask-frontend/          # 신규 — 일꾼을묻다 도메인 무관 페이지 복사 시작점
└── ask-core/              # 신규 — ai-avatar-core fork, 선거 모듈 제거
```

- 두 ASK 레포 모두 **별도 GitHub repo + 별도 DB + 별도 도메인**(예: ask.kr / api.ask.kr).
- 사합 PR 흐름과 완전 분리. 사합 작업은 일꾼을묻다 production으로 계속.
- Unity 아바타(`ai-avatar-endpoint`)는 일단 v2까지 미사용(MVP는 텍스트 챗만).

---

## 8. 단계(마일스톤)

### Phase 0 — 모델 스케치 ← **지금**
- 이 문서 검토·확정
- ASK 브랜드/도메인 정하기(이름, .kr 등)
- GitHub 빈 레포 2개 준비(탐님 — `ask-core`, `ask-frontend`)

### Phase 1 — 백엔드 fork & 가지치기 (4~6일)
1. `ai-avatar-core` → `ask-core`로 fork
2. `app.module.ts`에서 선거 모듈 5개 import 제거
3. 엔티티 8개 제거(selective DB 마이그레이션)
4. `User` 재설계: election 필드 제거, `ProviderProfile` 추가
5. `Category` / `ProviderCategory` 엔티티 추가
6. controller path `candidate` → `provider` rename
7. 새 DB 생성 + 초기 마이그레이션 실행
8. Swagger로 endpoint 점검

### Phase 2 — 프론트 스캐폴드 (5~7일)
1. `ask-frontend` 빈 레포에 도메인 무관 페이지 복사: checkout / kakao-auth UI / voice 골격 / admin-dashboard 골격
2. 새로 작성: 카테고리·지역 검색, 전문가 상세+챗, 전문가 등록 폼, 전문가 대시보드
3. ko.ts 카피 시드(전문가 도메인 어휘)
4. ASK 브랜딩(로고/색)

### Phase 3 — 통합 & 시드 (3~5일)
1. 카테고리 10개 시드(의료/법무/세무/부동산/IT/교육/디자인/통번역/육아/상담)
2. 시연용 전문가 5~10명 seed
3. RAG 지식 베이스 1~2명 분량 업로드해서 챗 동작 확인
4. 결제 sandbox 통합 점검(포트원 별도 가맹점 필요 여부 확인)
5. 도메인 연결·SSL

**MVP 총 추정: 3~4주** (탐님 + 우리 + 필요시 사합 외주 1~2일)

---

## 9. 확정 필요 결정

이 문서 검토 후 탐님 확인이 필요한 항목:

1. **분리 전략**: 옵션 A(새 레포 2개) 확정?
2. **브랜드 이름**: "ASK" 고정? 영문 도메인 후보? `.kr`?
3. **MVP 카테고리 시드 10개** 동의?
4. **검수 흐름**: 전문가 등록 → 관리자 승인 → 노출 (일꾼 후보자 검수와 동일 패턴) 동의?
5. **결제**: 포트원 가맹점 별도 신청 필요한지 — 탐님이 포트원에 확인
6. **Unity 아바타 v2로 미루기** 동의? (MVP는 텍스트 챗 + 정적 프로필)
7. **사전 질문팩 / 1:1 라이브 상담 / 후기 평점** 셋 다 v2로 미루기 동의?

확정되면 Phase 1 시작합니다. **코드 변경은 아직 없음.**
