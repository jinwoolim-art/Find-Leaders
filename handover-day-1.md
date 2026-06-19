# Day 1 — Lo Hi 인수인계 받은 직후 작업 시나리오

목표: 인수인계서 + repo 받자마자 30분 안에 로컬 셋업 완료 + 첫 검증.

---

## ⏱️ 시나리오 (30분 ~ 1시간)

### Step 0 — 인수인계서에서 확인할 것 (5분)

받은 인수인계서에서 아래 정보 추출:

- [ ] **GitHub repo URL** (예: `https://github.com/Play4HQ/ai-avatar-core` 또는 다른 곳)
- [ ] **활성 브랜치명** (`main` / `dev` / `Dev-ongoing` 등 — 어느 게 sandbox 배포본?)
- [ ] **.env 변수 목록** + 실제 값
  - DATA_GO_KR_API_KEY
  - DB host/user/pass
  - JWT secret
  - OpenAI API key
  - Kakao SDK key
  - Replicate (아바타 영상용)
- [ ] **배포 방법** (GCP, Docker, Vercel 등?)
- [ ] **현재 작업 중 브랜치** + 미완성 PR
- [ ] **알려진 버그 목록**
- [ ] **DB 백업** (PostgreSQL dump 받았는지)

이 중 빠진 게 있으면 Lo Hi에 즉시 추가 요청.

### Step 1 — Clone + 초기 셋업 (10분)

```bash
cd /Users/jin-woolim/Documents/GitHub/
git clone <인수인계받은 URL> ai-avatar-core
cd ai-avatar-core
git checkout <활성 브랜치명>
yarn install   # 또는 npm install — package.json scripts 보고 결정
```

### Step 2 — `.env` 셋업 (5분)

```bash
cp .env.example .env
# 편집기로 .env 열어서 Lo Hi가 준 실제 값 채우기
```

⚠️ 절대 git에 .env 커밋 X. `.gitignore`에 있는지 확인.

### Step 3 — DB·Redis 띄우기 (3분)

우리 ilkkun-server 환경 그대로 재활용 가능:

```bash
docker network create game_service_net 2>/dev/null || true
docker compose up -d
docker compose ps    # 3개 컨테이너 다 Up 확인
```

기존 우리 ilkkun-server 컨테이너와 충돌하면:
- ilkkun-server 컨테이너 정지 → `cd ../ilkkun-server && docker compose stop`
- 또는 ai-avatar-core의 docker-compose.yml 포트 충돌 확인

### Step 4 — 마이그레이션 + 서버 실행 (5분)

```bash
yarn migrate          # 또는 npm run migrate
yarn start:dev        # 또는 npm run start:dev
```

→ Swagger UI 접속 확인: `http://localhost:4000/api/docs` (또는 인수인계 path)

### Step 5 — 첫 검증 (5분)

브라우저에서 Swagger 열고:
- [ ] User Auth endpoint 보임
- [ ] Candidate Auth endpoint 보임
- [ ] candidates / avatars 검색 endpoint 보임

DB 직접 확인:
```bash
docker exec -it pg_local_game_service psql -U root -d test-db
\dt              # 테이블 목록 — electoral_district, candidate, candidate_profile 등 있는지
SELECT COUNT(*) FROM candidate WHERE necHuboid IS NOT NULL;   # NEC 후보 몇 명?
\q
```

### Step 6 — 첫 PR 작성 (15분)

가장 시급한 픽스 — sgTypecode 매핑 정정:

```bash
git checkout -b fix/sgtypecode-mapping-correction
```

`nec.config.ts` 또는 `nec-importer.service.ts`에서:

```diff
- NEC_IMPORT_TYPECODES = '3,4,5,7,9'
+ NEC_IMPORT_TYPECODES = '3,4,5,6,11'
```

ElectionType seed 또는 NEC_TYPE_LABELS 에서:
```diff
- '7': '구·시·군의원'
+ '6': '구·시·군의원'
- '9': '교육감'
+ '11': '교육감'
```

커밋 + push:
```bash
git add -p
git commit -m "fix: correct NEC sgTypecode mapping (7→6 구의원, 9→11 교육감)"
git push origin fix/sgtypecode-mapping-correction
```

GitHub에서 PR 생성 → Lo Hi에게 review 요청.

---

## 체크리스트 — Day 1 완료 기준

- [ ] Repo clone 성공
- [ ] yarn install 성공
- [ ] DB·Redis 컨테이너 다 Up
- [ ] 서버 `npm run start:dev` 정상 실행
- [ ] Swagger UI 접속 OK
- [ ] DB candidate 테이블 NEC 후보 행수 확인
- [ ] sgTypecode 정정 PR 제출

---

## Day 2 이후 작업 — Cheatsheet 참고

→ `handover-issue-cheatsheet.md`
