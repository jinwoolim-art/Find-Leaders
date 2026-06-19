# 일꾼을묻다 — 카카오 로그인 백엔드 모듈

> 카카오 OAuth 기반 회원가입·로그인을 처리하는 **단독 NestJS 백엔드**.
> 사합 백엔드 통합용 — 그대로 이식하거나 코드/명세 참조로 활용.

## 빠른 시작

```bash
cp .env.example .env   # 값 채우기
npm install
npm run start:dev      # http://localhost:3001/api
```

## 디렉토리

```
kakao-auth-server/
├── src/
│   ├── main.ts                    # NestJS 부트스트랩
│   ├── app.module.ts              # TypeORM + 모듈 등록
│   ├── auth/
│   │   ├── kakao.service.ts       # 카카오 API 호출
│   │   ├── auth.service.ts        # 로그인/가입/리프레시 로직
│   │   ├── auth.controller.ts     # POST /auth/kakao 외 5개
│   │   ├── jwt.strategy.ts        # passport-jwt
│   │   ├── jwt-auth.guard.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   ├── users/
│   │   ├── user.entity.ts         # users 테이블
│   │   ├── users.service.ts       # upsertKakaoProfile / completeSignup
│   │   └── users.module.ts
│   └── tokens/
│       ├── refresh-token.entity.ts # refresh_tokens 테이블
│       ├── tokens.service.ts       # refresh rotation
│       └── tokens.module.ts
├── docs/
│   ├── api-spec.md      # 프론트엔드/통합자용 API 명세
│   ├── db-schema.sql    # DBA/마이그레이션용 스키마
│   └── handoff.md       # 백엔드 작업자 핸드오프 가이드
└── test/
    ├── manual-test.md   # curl/Postman 테스트
    └── test-client.html # 브라우저에서 OAuth 전체 흐름 테스트
```

## API 개요

| Method | Path                          | 설명 |
|--------|-------------------------------|------|
| POST   | `/api/auth/kakao`             | 카카오 code → 로그인 or 신규 signupToken |
| POST   | `/api/auth/kakao/complete-signup` | 신규 사용자 약관·역할 입력 후 가입 완료 |
| POST   | `/api/auth/refresh`           | accessToken 재발급 (refresh rotation) |
| POST   | `/api/auth/logout`            | refresh 토큰 폐기 |
| GET    | `/api/auth/me`                | 현재 사용자 (Bearer accessToken) |

상세 명세 → [`docs/api-spec.md`](docs/api-spec.md)

## 사합 백엔드에 통합하려면

→ [`docs/handoff.md`](docs/handoff.md) 참고

## 테스트하려면

→ [`test/manual-test.md`](test/manual-test.md) 참고
