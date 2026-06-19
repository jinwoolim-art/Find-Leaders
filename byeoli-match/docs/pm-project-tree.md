# 별이(Match) PM 트리

작성: 2026-05-28 · 작성자: 클로드_3-1 (PM)
**2026-05-28 옵션 C update**: 단순화. Match 단일 메인 프로젝트.

---

## 1. 전체 프로젝트 세션 맵 (옵션 C 결정 후)

```
탐님 (전체 결정·법무·brand·디자인)
   ↓
클로드_3-1 (이 세션, PM 통합)
   │
   ├── ASK Ask mode (전문가 1:1 자문) — 별도 작은 프로젝트로 유지
   │      상태: Task 01 PR #1 완료. 추가 작업 시 PM이 결정
   │      메모리: [[ask-task01-pr-submitted]] [[ask-helpbot-funnel]]
   │
   ├── ASK Coach §17 (다대일 양육) — [ARCHIVED] ❌
   │      사유: 사업성 미검증·Match 집중
   │      매커닉 (카드·xp·LLM·시퀀스): Match 명세 안 흡수
   │      명세: ask-frontend/docs/tasks/02-trainee-system.md (참고용)
   │      메모리: [[ask-task02-design-complete]] (archive 기록)
   │
   ├── ASK Mediate §17 (단체 매개) — [ARCHIVED] ❌
   │      사유: 사업성 미검증·Match 집중
   │      매커닉 (AI draft·매개 큐·카드 set): Match 명세 안 흡수
   │      명세: ask-frontend/docs/tasks/03-family-system.md (참고용)
   │      메모리: [[ask-task03-mediation-design-complete]] (archive 기록)
   │
   └── 별이 Match — **메인 프로젝트** ✅
          구현: 클로드_5 (신규 세션)
          명세: Find-Leaders/byeoli-match/docs/spec.md (완성·옵션 C update)
          Phase 1 가이드: byeoli-match/docs/phase1-implementation-guide.md (완성)
          상태: 클로드_5 인계 대기
          메모리: [[match-byeoli-inception]] [[match-byeoli-spec-complete]] [[match-option-c-decision]]
```

---

## 2. 자산 흐름 (옵션 C 후 단순화)

```
일꾼 ai-avatar-core (검증됨)
   │
   └─→ 별이 Match (byeoli-server fork)
          ├─ NestJS backbone
          ├─ OAuth (카카오·Apple)
          ├─ AI 아바타·LLM·voice
          ├─ 결제 (포트원)
          ├─ DB·migration·WebSocket
          └─ 매칭 알고리즘 (정책 매칭 응용)

ASK Coach §17 archive (매커닉만 흡수)
   │
   └─→ Match 명세 §17.B.1·B.2·D (카드·xp·LLM·시퀀스 직접 명세화)

ASK Mediate §17 archive (매커닉만 흡수)
   │
   └─→ Match 명세 §17.B.4·B.5 (AI draft·매개 큐·카드 set 직접 명세화)
```

→ 코드 import 없음. Match 명세 안에서 모든 매커닉 자체 명세 완료.

---

## 3. 세션 책임 영역 (단순화)

### 클로드_3-1 (이 세션 — PM)

**현재 책임**:
- ✅ Match 명세 완성·Phase 1 가이드 작성
- ✅ Coach·Mediate archive 처리
- ✅ PM 트리 단순화 (이 문서)
- ⏳ 클로드_5 진행 monitoring
- ⏳ 탐님 보고 (Phase 완료 시)
- ⏳ Match v1.x 명세 (출시 후 운영 데이터 보고)
- ⏳ ASK Ask mode 추가 작업 (필요 시)

### 클로드_5 (Match 별이 구현 — 신규 세션)

**책임**:
- Match 명세대로 구현 (`match_*` namespace, byeoli-server·byeoli-frontend 2 레포)
- Phase 1~5 (일꾼 fork·DB·UX·매칭·결제·안전)
- 일꾼 backbone fork·refactor·도메인 어휘 변경
- LLM 3 prompt 통합 (Claude Haiku 4.5)

**보고**:
- Phase 완료 시 클로드_3-1 (PM) + 탐님

### ~~클로드_4 (Coach 별 §17)~~ — **작업 중단**
- 옵션 C 결정으로 작업 중단
- 향후 Match 출시 후 Coach 별도 사업 재검토 시 재가동 가능 (현재 X)

### ~~클로드_5 (Mediate §17)~~ — **작업 중단**
- 옵션 C 결정으로 작업 중단
- 향후 Match 출시 후 Mediate 별도 사업 재검토 시 재가동 가능 (현재 X)

---

## 4. 진행 상황 trace

| 일자 | 영역 | 상태 |
|---|---|---|
| 2026-05-27 | ASK Task 01 v3 시민 PR #1 | 완료 (클로드_2) |
| 2026-05-28 | ASK Coach §17 명세 | 완성 후 archive (옵션 C) |
| 2026-05-28 | ASK Mediate §17 명세 | 완성 후 archive (옵션 C) |
| 2026-05-28 | Match 별이 inception·명세·Phase 1 가이드 | 완료 (클로드_3-1) |
| 2026-05-28 | 옵션 C 결정: Coach·Mediate archive·Match 단일 메인 | 탐님 결정 |
| 2026-05-28 | Match 명세 옵션 C update (직접 명세화) | 완료 (클로드_3-1) |

---

## 5. 탐님 다음 단계 to-do (옵션 C 후)

### 즉시
1. **GitHub 레포 생성**:
   - `byeoli-server` (일꾼 fork — Match 백엔드)
   - `byeoli-frontend` (RN 신규 — Match 프론트)
2. **클로드_5 새 세션 시작** (Match Phase 1):
   - 첫 prompt: "별이(Match) Phase 1 시작합니다. `Find-Leaders/byeoli-match/docs/spec.md` + `phase1-implementation-guide.md` 읽고 Step 1부터 진행해주세요"
3. **클로드_4·클로드_5 작업 중단 통보** (옵션 C 결정 알림)

### 병렬 (1-2주)
4. **변호사 자문** — `Find-Leaders/docs/byeoli-match-inception.md` §5 의 10 항목
5. **브랜드 명 확정** — "별이" 가제 → 실제 brand
6. **디자인 작업** — 별이 아바타·UI·디자인 시스템

### Phase 1 완료 후
7. 클로드_5 보고 받기
8. PM 정리 update
9. v1.x 후속 task 결정 (운영 데이터 기반)

---

## 6. 통합 보고 형식 (탐님께, 단순화)

각 Phase 완료 시 PM 보고:

```
[Match Phase X 보고 — YYYY-MM-DD]

작업: ___
상태: ___ (완료/진행/blocker)
다음: Phase X+1
탐님 결정 필요 사항: ___ (있을 시)
LLM 비용: $___/월 (모니터링)
사용자 가입: ___명 (출시 후)
```

---

## 7. 위험 영역

### 7.1 일꾼 backend 변경
- 사합이 `ai-avatar-core` 변경 시 → Match 영향
- 해결: 사합 PR 모니터링 (메모리 [[sahab-conflict-coordination]])

### 7.2 LLM 비용
- Match 단일 = $40/월/1K 사용자 (Coach·Mediate 합산 X)
- 10K 사용자 = $400/월 = ₩540K/월
- 매출 대비 0.1% 이하 (매우 안전)

### 7.3 변호사 자문 지연
- 정통 데이팅 앱 분류·인증 의무 명확화 필요
- Phase 1-3 (백엔드·매칭) 까지는 자문 결과 없어도 진행 가능
- Phase 4-5 (결제·인증) 전에 자문 결과 필요

---

## 8. 메모리 references (옵션 C 후)

- [[match-byeoli-inception]] — Match inception
- [[match-byeoli-spec-complete]] — Match 명세 complete
- [[match-option-c-decision]] — 옵션 C 결정 기록 (2026-05-28)
- [[ai-avatar-core-handover]] — 일꾼 backbone
- [[apple-auth-added]] [[pg-portone]] [[claude-api]] — 일꾼 자산 reference
- [[ask-task01-pr-submitted]] [[ask-helpbot-funnel]] — ASK Ask mode (유지)
- [[ask-task02-design-complete]] [[ask-task03-mediation-design-complete]] — archive 기록

---

## 9. 마지막 한 줄

탐님 옵션 C 결정 (2026-05-28). Match 단일 메인 프로젝트. Coach·Mediate archive. 클로드_3-1 PM. 클로드_5 구현. 단순·집중·자산 살림 균형 최적.
