# 애플 로그인 (Sign in with Apple) — 핸드오프 가이드

> 이 문서는 `kakao-auth-server/` 에 추가된 **애플 로그인 모듈**의
> 설정·흐름·API 명세, 그리고 사합 백엔드(`ai-avatar-core`) 통합 방법을 담습니다.
> 카카오 모듈(`docs/handoff.md`, `docs/api-spec.md`)과 같은 패턴입니다.

---

## 0. 왜 애플 로그인이 필요한가

시민용 Unity iOS 앱이 **카카오 로그인(타사 소셜 로그인)**을 제공합니다.
Apple App Store 심사 가이드라인 **4.8 (Login Services)** 에 따라,
타사 소셜 로그인을 제공하는 앱은 **Sign in with Apple 도 반드시 함께 제공**해야 합니다.
→ iOS 앱 출시를 위해 애플 로그인은 **선택이 아니라 필수**입니다.

---

## 1. 이 모듈이 추가한 것

| 파일 | 역할 |
|------|------|
| `src/auth/apple.service.ts` | id_token 검증(JWKS), code 교환, client_secret 생성, 토큰 폐기 |
| `src/auth/dto/apple-login.dto.ts` | `/auth/apple` 요청 검증 |
| `src/auth/auth.service.ts` | `loginWithApple()` — 신규/기존 분기 (카카오와 동일 구조) |
| `src/auth/auth.controller.ts` | `POST /auth/apple`, `POST /auth/apple/complete-signup` |
| `src/users/user.entity.ts` | `apple_id`, `apple_email` 컬럼 추가, `kakao_id` nullable 화 |
| `scripts/gen-apple-client-secret.ts` | .p8 키 검증 + curl 테스트용 client_secret 생성기 |

추가 의존성: `jsonwebtoken`, `jwks-rsa` (이미 `npm install` 반영).

---

## 2. Apple 콘솔 체크리스트  ⚠️ 탐님 영역

[Apple Developer](https://developer.apple.com/account) 에서 아래를 발급/설정해 `.env` 에 채웁니다.
(Apple Developer Program 멤버십 — 법인은 D-U-N-S 번호 필요. 가입비 $99/년)

| # | 위치 | 결과 → .env |
|---|------|-------------|
| 1 | **Membership** 페이지 우측 Team ID (10자리) | `APPLE_TEAM_ID` |
| 2 | **Identifiers > App IDs** → 앱 Bundle ID 선택 → **Sign in with Apple** capability 체크 | `APPLE_BUNDLE_ID` |
| 3 | **Identifiers > Services IDs** → 새로 생성 → Sign in with Apple 설정에서 Primary App ID 연결 + 도메인 + Return URL 등록 *(웹 로그인 쓸 때만)* | `APPLE_SERVICES_ID` |
| 4 | **Keys** → `+` → Sign in with Apple 체크 → 생성 → **`.p8` 파일 다운로드(1회 한정!)** + Key ID 메모 | `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` |

- `.p8` 파일은 `kakao-auth-server/secrets/AuthKey.p8` 에 두세요 — `secrets/`·`*.p8` 는 `.gitignore` 처리됨.
- **`.p8` 키 내용은 채팅·메신저에 붙여넣지 마세요.** 파일만 로컬에 두면 됩니다.
- 네이티브 iOS(Unity): Xcode/Unity 빌드 설정에 **Sign in with Apple capability** 를 추가해야 합니다.
- 웹만 안 쓰면 3번(Services ID)·`APPLE_REDIRECT_URI` 는 비워둬도 됩니다.

검증: `.env` 를 채운 뒤 `npm run gen:apple-secret` → ES256 JWT 가 나오면 1·2·4번 조합 정상.

---

## 3. 로그인 흐름

애플은 카카오와 핵심이 다릅니다:

| | 카카오 | 애플 |
|---|--------|------|
| 사용자 정보 조회 | userinfo API 호출 | **id_token(JWT) 검증**으로 추출 (별도 API 없음) |
| 이름/이메일 | 매번 조회 가능 | **최초 인가 1회만** 내려줌 → 이후 `null` 가능 |
| client_secret | 콘솔의 고정 문자열 | **.p8 키로 ES256 서명한 JWT** (최대 6개월 만료) |
| 고유 ID | `id` (숫자) | id_token 의 `sub` (문자열) |

### 네이티브 (iOS Unity 앱) — 주 사용 경로

```
[앱] Sign in with Apple 버튼 → ASAuthorization
   ↓ identityToken(+authorizationCode, user) 획득
[앱→서버] POST /auth/apple { platform:"ios", identityToken, ... }
[서버] JWKS 로 id_token 서명 검증 → sub/email 추출 → DB upsert
   ├─ 신규: { isNewUser:true, signupToken, appleProfile }
   └─ 기존: { isNewUser:false, accessToken, refreshToken, user }
```

### 웹

```
[웹] Apple JS → appleid.apple.com 인증 → authorizationCode 수신
[웹→서버] POST /auth/apple { platform:"web", authorizationCode, redirectUri }
[서버] code → 애플 토큰 교환 → id_token 검증 → (이하 동일)
```

---

## 4. API 명세

Base URL: `http://localhost:3001/api`

### `POST /auth/apple` — 애플 로그인

**Request**
```json
{
  "platform": "ios",
  "identityToken": "<애플 id_token JWT>",
  "authorizationCode": "<애플 code, 선택>",
  "user": { "firstName": "길동", "lastName": "홍" },
  "nonce": "<선택>",
  "redirectUri": "<웹 code 교환 시 필요>"
}
```
- `platform`: `"ios"`(기본) | `"web"`. `aud` 검증과 code 교환 client_id 를 결정.
- `identityToken` **또는** `authorizationCode` 중 최소 하나 필수.
- `user`: **최초 로그인 1회만** 존재. 클라이언트가 평탄화해 전달.
- `nonce`: 클라이언트가 사용했을 때만. id_token 의 `nonce` 와 일치 검증.

**Response 200 — 기존 사용자**
```json
{
  "isNewUser": false,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": 12, "provider": "apple",
    "kakaoId": null, "appleId": "001234.abcd...5678",
    "email": "user@privaterelay.appleid.com",
    "nickname": "홍길동", "profileImageUrl": null,
    "phone": "010-1234-5678", "role": "voter", "signupCompleted": true
  }
}
```

**Response 200 — 신규 사용자**
```json
{
  "isNewUser": true,
  "signupToken": "eyJ...",
  "appleProfile": {
    "appleId": "001234.abcd...5678",
    "name": "홍길동",
    "email": "user@privaterelay.appleid.com"
  }
}
```

**Error**
| Status | code | 의미 |
|--------|------|------|
| 400 | `APPLE_LOGIN_INPUT_MISSING` | identityToken·authorizationCode 둘 다 없음 |
| 401 | `APPLE_ID_TOKEN_MALFORMED` | id_token 형식 오류 |
| 401 | `APPLE_ID_TOKEN_INVALID` | 서명/iss/aud/exp 검증 실패 |
| 401 | `APPLE_NONCE_MISMATCH` | nonce 불일치 |
| 502 | `APPLE_JWKS_UNAVAILABLE` | 애플 공개키 서버 조회 실패 |
| 502 | `APPLE_TOKEN_EXCHANGE_FAILED` | code 교환 실패 |
| 500 | `APPLE_PRIVATE_KEY_MISSING` / `_UNREADABLE` | .p8 키 설정 오류 |

### `POST /auth/apple/complete-signup` — 신규 가입 완료

카카오의 `/auth/kakao/complete-signup` 과 **요청·응답 동일** (`docs/api-spec.md` 참고).
`signupToken` 은 프로바이더 무관 — 동일 핸들러를 재사용합니다.

이후 `/auth/refresh`, `/auth/logout`, `/auth/me` 는 카카오와 완전히 공유됩니다.

---

## 5. 사합 `ai-avatar-core` 통합 가이드

실제 운영 백엔드는 사합 `ai-avatar-core` 입니다. Unity 앱은 카카오를
`POST /api/v1/auth/mobile/kakao-login` 으로 처리하므로(`unity-client-contract-report.md` 참고),
애플도 **동일 패턴**으로 `/auth/mobile/apple-login` 을 추가하면 됩니다.

> **English summary for the backend dev (f-kazemi-dev):**
>
> Add `POST /api/v1/auth/mobile/apple-login`, mirroring the existing
> `mobile/kakao-login`. The Unity app obtains an Apple **identity token** + an
> **authorization code** natively via a Sign in with Apple plugin and sends:
>
> ```
> POST /api/v1/auth/mobile/apple-login
> Header: Authorization: Bearer <guest JWT>     // same guest-first rule as Kakao
> Body:   {
>           "identityToken": "<Apple id_token JWT>",
>           "authorizationCode": "<Apple code>",   // optional, for revocation
>           "user": { "firstName": "...", "lastName": "..." },  // first login only
>           "nonce": "<optional>"
>         }
> ```
>
> Backend steps (see `src/auth/apple.service.ts` for a reference implementation):
> 1. Verify `identityToken`: fetch Apple JWKS (`https://appleid.apple.com/auth/keys`),
>    verify RS256 signature, check `iss == https://appleid.apple.com`,
>    `aud == <iOS bundle id>`, and `exp`.
> 2. Use the `sub` claim as the stable Apple user id (column `apple_id`).
> 3. `email`/name come **only on the first authorization** — never overwrite a
>    stored value with `null` on later logins.
> 4. Upsert the user and return the same `LoginResponseModel` as `kakao-login`.
> 5. The `client_secret` is an **ES256 JWT** signed with the `.p8` key
>    (Team ID, Key ID, Services/Bundle ID) — needed only for `code` exchange
>    and for token revocation on account deletion.
>
> DB: add `apple_id VARCHAR(255) UNIQUE` and `apple_email VARCHAR(255)` to the
> users table; make `kakao_id` nullable (see `docs/db-schema.sql`).

옵션 A(코드 통째 이식) / B(명세만 맞춰 포팅) 는 `docs/handoff.md` 5번과 동일합니다.

---

## 6. 보안 / 운영 TODO

- [ ] **회원 탈퇴 시 토큰 폐기** — App Store 가이드 5.1.1(v): 계정 삭제 기능 필수.
      애플은 `code` 교환으로 받은 `refresh_token` 을 저장해 두었다가 탈퇴 시
      `AppleService.revokeToken()` 으로 폐기해야 함. (현재 모듈은 메서드만 제공,
      `refresh_token` 영구 저장 컬럼은 미추가 — 운영 도입 시 결정)
- [ ] **client_secret 자동 갱신** — JWT 라 매 요청 시 생성하므로 만료 걱정 없음(현 구현).
      .p8 키 자체를 콘솔에서 폐기/회전하면 `.env` 교체 필요.
- [ ] **가린 이메일(@privaterelay.appleid.com)** — 이 주소로 메일을 보내려면 Apple 콘솔의
      "Sign in with Apple for Email Communication" 에 발신 도메인/SPF 등록 필요.
- [ ] **nonce 정식 도입** — 현재는 클라이언트가 보낸 값과 일치만 검증. 서버가 nonce 를
      발급·1회성 관리하면 재생공격 방어가 더 견고.
- [ ] 운영 DB `users` 테이블에 `apple_id`/`apple_email` 마이그레이션 적용.

---

## 7. 카카오 ↔ 애플 핵심 차이 요약

1. 애플은 **userinfo API 가 없다** — id_token(JWT) 을 JWKS 로 검증해서 정보 추출.
2. **이메일·이름은 최초 1회만** 온다 — `null` 로 기존 값 덮어쓰기 금지.
3. **client_secret 은 .p8 로 서명한 JWT** — 최대 6개월. 이 모듈은 매번 새로 생성.
4. 가입에 쓴 프로바이더에 따라 `kakao_id` **또는** `apple_id` 한쪽만 채워진다.
