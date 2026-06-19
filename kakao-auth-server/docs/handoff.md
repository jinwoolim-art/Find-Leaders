# 백엔드 작업자 핸드오프 가이드

> 이 디렉토리는 **카카오 로그인 단독 모듈**입니다.
> 사합 백엔드 프로젝트에 통째로 이식하거나, 코드를 참조용으로 가져갈 수 있게 구성했습니다.

---

## 1. 이 모듈이 하는 일

1. 프론트에서 받은 **카카오 인가코드(code)** → 카카오 서버에 토큰 교환
2. 카카오 사용자 정보 조회 → DB upsert
3. 신규: **signup token** 발급 (가입 미완료 표시)
4. 기존: **access + refresh JWT** 발급
5. 신규는 약관·역할 입력 후 `/auth/kakao/complete-signup` 으로 가입 완료
6. `/auth/refresh` 로 토큰 회전 (refresh rotation: 1회용)
7. `/auth/me` 로 본인 정보 조회 (Bearer)

---

## 2. 사용 환경

| 항목 | 값 |
|------|------|
| 런타임 | Node.js 20+ |
| 프레임워크 | NestJS 10 (TypeScript) |
| ORM | TypeORM |
| DB | PostgreSQL 14+ |
| 인증 | passport-jwt + JWT (access/refresh/signup 분리 secret) |

> **다른 스택을 쓰고 있다면**: `docs/api-spec.md` 명세와 `docs/db-schema.sql` 스키마만 맞추면 됩니다.
> `src/auth/kakao.service.ts` 의 카카오 API 호출 로직은 모든 언어로 직역 가능합니다.

---

## 3. 시작 방법

```bash
cd kakao-auth-server
cp .env.example .env
# .env 안의 값들 채우기 (특히 KAKAO_REST_API_KEY, JWT_* secret, DB_*)

npm install
npm run start:dev
```

PostgreSQL 이 떠 있어야 합니다. 로컬에서 빠르게 띄우려면:
```bash
docker run --name ilkkun-pg -e POSTGRES_USER=ilkkun -e POSTGRES_PASSWORD=change_me -e POSTGRES_DB=ilkkun_dev -p 5432:5432 -d postgres:16
```

`DB_SYNCHRONIZE=true` 면 첫 부팅에 `users`, `refresh_tokens` 테이블 자동 생성됩니다.

---

## 4. 카카오 콘솔 설정 체크리스트

1. https://developers.kakao.com/console/app 에서 앱 생성
2. **앱 키 > REST API 키** → `.env` 의 `KAKAO_REST_API_KEY`
3. **플랫폼 > Web** → 사이트 도메인 등록 (`http://localhost:5500`, 운영 도메인)
4. **카카오 로그인 > 활성화 ON**
5. **카카오 로그인 > Redirect URI** → `.env` 의 `KAKAO_REDIRECT_URI` 와 정확히 일치
6. **동의항목** 설정
   - 닉네임/프로필사진/이메일은 비즈앱 없이도 OK
   - 전화번호/CI/생년월일은 비즈앱 + 권한 신청 필요
7. **보안 > Client Secret** (선택) ON 했다면 `.env` 에 입력

---

## 5. 사합 백엔드에 통합하는 방법

### 옵션 A — 통째로 이식 (NestJS 프로젝트인 경우)

1. `src/auth/`, `src/users/`, `src/tokens/` 디렉토리를 그대로 복사
2. `AppModule` 에 `AuthModule`, `UsersModule`, `TokensModule` 추가
3. `package.json` 에 의존성 추가 (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `axios`, `class-validator` 등)
4. `.env` 항목 추가
5. DB 마이그레이션 실행 (`docs/db-schema.sql` 참고)

### 옵션 B — 다른 스택으로 포팅

- **명세 (docs/api-spec.md)** 와 **DB 스키마 (docs/db-schema.sql)** 만 맞추면 됩니다.
- 카카오 API 호출 부분은 `src/auth/kakao.service.ts` 참고 (HTTP POST 2번이 전부)
- JWT 구조는 표준이라 어떤 라이브러리든 호환

### 옵션 C — 별도 마이크로서비스로 운영

이 모듈을 그대로 띄워두고, 사합 메인 서버가 `/auth/*` 만 이쪽으로 프록시.
서비스 분리도가 높지만, 1주일 안에는 옵션 A 가 가장 빠름.

---

## 6. 기존 users 테이블이 있는 경우

사합에 이미 `users` 가 있으면 **새 테이블 만들지 말고** 컬럼만 추가:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kakao_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agree_privacy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agree_marketing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
```

`refresh_tokens` 는 새로 만들기.

`user.entity.ts` 의 `@Entity('users')` 도 실제 테이블 이름에 맞게 수정.

---

## 7. 보안 체크포인트

- [x] **refresh rotation** — 1회용. 재사용 시도 시 즉시 폐기 (`tokens.service.ts`)
- [x] **refresh hash 저장** — DB 에는 sha256 해시만. 원본 JWT 저장 X
- [x] **access/refresh/signup secret 분리** — 각각 다른 시크릿
- [x] **약관 동의 강제** — `agreeTerms`, `agreePrivacy` 가 true 가 아니면 가입 완료 거부
- [ ] **CSRF** — refresh 를 쿠키로 옮길 경우 추가 필요
- [ ] **rate limit** — `@nestjs/throttler` 추가 권장 (특히 `/auth/kakao`, `/auth/refresh`)
- [ ] **CORS** — 운영에선 `origin` 화이트리스트로 좁힐 것 (`main.ts`)
- [ ] **logging** — 액세스 로그/감사 로그는 사합 표준에 맞춰 추가

---

## 8. 운영 전 TODO

- [ ] `DB_SYNCHRONIZE=false` 로 변경 + 정식 마이그레이션 도입
- [ ] JWT secret 들 모두 `openssl rand -base64 48` 으로 새로 생성
- [ ] `KAKAO_CLIENT_SECRET` 카카오 콘솔에서 ON 후 입력
- [ ] CORS origin 화이트리스트
- [ ] rate limit 추가
- [ ] 비즈앱 심사 통과 후 `KAKAO_REDIRECT_URI` 를 운영 도메인으로 변경
- [ ] 운영 DB 의 `users` 테이블에 마이그레이션 적용

---

## 9. 애플 로그인

이 모듈은 **애플 로그인(Sign in with Apple)** 도 함께 제공합니다.
설정·흐름·API 명세·사합 통합 방법은 → **`docs/apple-login-handoff.md`**

---

## 10. 질문이 생기면

- 명세 관련: `docs/api-spec.md` (카카오), `docs/apple-login-handoff.md` (애플)
- 흐름 관련: 본 문서 1번
- 테스트 방법: `test/manual-test.md`
- 카카오 콘솔: `developers.kakao.com` 또는 위 4번
- 애플 콘솔: `developer.apple.com/account` 또는 `apple-login-handoff.md` 2번
