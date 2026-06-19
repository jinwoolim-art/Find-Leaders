# 다음 Claude 세션 시작용 메시지 (복붙해서 사용)

일꾼을묻다 백엔드 작업 이어가자. 어제(2026-05-18) 큰 진척 있었어.

---

## 현재 상태 (인수 완료)

- `metarailix/ai-avatar-core` (dev 브랜치, 255 commits) 로컬에 셋업 끝
- `/Users/jin-woolim/Documents/GitHub/ai-avatar-core/`
- Swagger: `http://localhost:3000/api/docs` 정상
- DB 컨테이너 2개 healthy (postgres + pgvector)
- `.env` 두 가지 정정 적용:
  - `NEC_OP_PRE_CANDIDATES=getPofelcddRegistSttusInfoInqire` (Pofel, 본후보자)
  - `NEC_IMPORT_TYPECODES=3,4,5,6,11` (검증된 정확한 매핑)
- 사합한테 컨펌 받음. Lo Hi는 사실상 떠남(마음).

## 탐의 결정 사항

- **Lo Hi 의존 X** — 마음 떠난 상태. 보험으로만 생각.
- **사합 = 관리자, 탐이 OK 주는 입장**. PM 역할.
- **우리(탐 + Claude)가 작업·테스트** → 탐 OK → 사합한테 머지만 시킴.
- **6/13 운영 시작** 데드라인. 시차·소통 부담 영구 해결 모드.
- **GitHub 계정** = `jinwoolim-art` (메인). `betagob` 보조.
- **현재 권한** = Read access. Write 필요 시 사합한테 요청.

## 다음 6개 작업 (우선순위)

| # | 작업 | 우선순위 | 누가 |
|---|---|---|---|
| 1 | 선거구 수정 (sgTypecode 정정 PR) | 🔴 P0 진행 중 | 우리 PR |
| 2 | 대시보드 잔잔한 수정 (자막·사진·통계) | 🔴 **P0 내일!** | 우리 (백+프론트 다) |
| 3 | 시민의 목소리 (시민→후보자 신규 모듈) | 🟢 P2 (6/13 후 추천) | 우리 |
| 4 | 음성 반응속도 향상 | 🟢 P2 다음 주 | 우리 (측정→fix) |
| 5 | 예상질문 → 대화창 버튼화 (즉답) | 🟡 P1 | 우리 (cache 활용) |
| 6 | 가격정책 (후보자 대화량 조정·시민당 한도) | 🟡 P1 | 탐 정책 결정 + 우리 구현 |

## 작업 흐름 (안전 보장)

```
1. 작업 시작 전 사합한테 "이 파일 우리가 만질게" 공유 (충돌 방지)
2. 우리 로컬에서 코드 + migration 작업·테스트
3. 탐 OK
4. PR 생성·push (Write access 받았으면 직접, 아니면 fork)
5. 사합 머지 → CI/CD 자동 → sandbox.thisishilo.ir 즉시 반영
6. sandbox에서 재검증 (NEC API 직접 호출 등)
```

## 위험 5가지 + 방지

| 위험 | 방지 |
|---|---|
| DB 데이터 차이 (로컬 빈 / sandbox 9000명) | NEC API 직접 호출해서 로컬에도 채움 |
| 사합 동시 작업 충돌 | 작업 시작 전 분담 공유 ⭐ |
| .env 차이 | 작업별 필요 키 명확화 |
| 외부 서비스 차이 (OpenAI 키 등) | 음성 챗 작업 시 production 키 임시 요청 |
| migration 누락 | 코드 + migration 파일 항상 세트로 PR |

## 다음 세션 첫 액션 (이 순서)

1. **두 repo 관계 매핑** (host-panel + core 분석, ~1시간)
2. **2번 대시보드 수정 명세 작성** (3~4시간) — 자막 리스트·사진 crop·통계 항목 정의
3. **사합에 작업 분담 공유 메시지** 보내기
4. **NEC import 검증** (우리 정정 매핑 작동 확인)
5. **sgTypecode 정정 PR** 만들기

## 메모리 자동 로드 — 새 Claude가 알아야 할 것

`~/.claude/projects/-Users-jin-woolim-Documents-GitHub-Find-Leaders/memory/` 에 핵심 다 박혀있음:

핵심 메모리:
- `project_ai_avatar_core_handover.md` — 이번 인수 결과
- `project_work_plan_2026_05_18.md` — 6개 작업 plan
- `reference_nec_sgtypecode.md` — sgTypecode 매핑 (7→6, 9→11)
- `reference_dashboards_thisishilo.md` — repo·계정·작업자 정보
- `project_district_mapping_audit.md` — 선거구 깨진 패턴
- `project_613_milestone.md` — 6/13 데드라인
- `project_crisis_1week.md` — 1주일 위기 맥락
- `project_question_pack.md` — 사전 질문 130개 매커니즘

## 탐 답답함 줄여주는 핵심 원칙

- **외주 의존 최소화** — 우리가 작업·결정·테스트, 사합은 머지만
- **작업 → 컴펌 → 머지 흐름 명확** — 탐이 OK 안 한 건 절대 sandbox 안 감
- **분담 공유 필수** — 충돌 방지
- **migration 세트** — schema 차이로 깨지지 않게

---

## 새 세션에서 시작 메시지 예시 (한 줄)

> 일꾼을묻다 백엔드 작업 이어가자. 어제 ai-avatar-core 인수 끝났고
> 메모리 다 박혀있어. 우선순위 2번(대시보드) 명세 작성부터 시작.

→ 새 Claude가 메모리 자동 로드해서 이 모든 컨텍스트 알고 이어 감.
