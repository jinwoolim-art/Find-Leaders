# 수동 테스트 가이드

## 0. 사전 준비

1. 카카오 콘솔에서 앱 생성 + REST API 키 확보
2. **Redirect URI** 등록: `http://localhost:5500/callback` (이 가이드 기준)
3. `.env` 채우기:
   ```
   KAKAO_REST_API_KEY=발급받은_REST_API_키
   KAKAO_REDIRECT_URI=http://localhost:5500/callback
   ```
4. PostgreSQL 떠 있는지 확인 (`DB_SYNCHRONIZE=true` 면 자동 테이블 생성)
5. `npm run start:dev`

---

## 1. 가장 쉬운 방법 — 브라우저 테스트 클라이언트

```bash
# 새 터미널에서 (kakao-auth-server 루트에서 실행)
cd kakao-auth-server
python3 -m http.server 5500
```

브라우저로 `http://localhost:5500/test/test-client.html` 열기 → 화면에서 전체 흐름 클릭만으로 테스트.

> ⚠️ 이 URL 이 카카오 콘솔에 등록한 **Redirect URI** 와 정확히 일치해야 합니다.

---

## 2. curl 로 단계별 테스트

### 2-1. 인가코드 받기 (브라우저)

아래 URL 을 브라우저 주소창에 붙여넣기 (REST_API_KEY 만 본인 것으로 교체):

```
https://kauth.kakao.com/oauth/authorize?client_id=REST_API_KEY&redirect_uri=http://localhost:5500/callback&response_type=code
```

카카오 로그인 + 동의 → `http://localhost:5500/callback?code=xxxxx` 로 리다이렉트.
URL 의 `code=` 뒤 값을 복사 (이 코드는 **10분 + 1회용**).

### 2-2. 로그인 (신규)

```bash
curl -X POST http://localhost:3001/api/auth/kakao \
  -H "Content-Type: application/json" \
  -d '{"code":"방금복사한코드"}'
```

응답 예:
```json
{
  "isNewUser": true,
  "signupToken": "eyJhbGci...",
  "kakaoProfile": { ... }
}
```

### 2-3. 가입 완료

```bash
curl -X POST http://localhost:3001/api/auth/kakao/complete-signup \
  -H "Content-Type: application/json" \
  -d '{
    "signupToken": "위에서_받은_signupToken",
    "role": "voter",
    "phone": "010-1234-5678",
    "agreeTerms": true,
    "agreePrivacy": true,
    "agreeMarketing": false
  }'
```

응답 예:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { ... }
}
```

### 2-4. 본인 정보 조회

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer 위_accessToken"
```

### 2-5. 토큰 재발급

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"위_refreshToken"}'
```

> 응답으로 받은 **새 refreshToken** 으로 교체해야 함. 이전 건 폐기됨.

### 2-6. 로그아웃

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"현재_refreshToken"}'
```

### 2-7. 재로그인 (기존 사용자)

2-1 반복 → 2-2 호출. 이번엔:
```json
{
  "isNewUser": false,
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... "signupCompleted": true }
}
```

---

## 3. 자주 마주치는 에러

| 응답 code | 원인 | 해결 |
|----------|------|------|
| `KAKAO_TOKEN_EXCHANGE_FAILED` + `invalid_grant` | 인가코드 만료/이미사용 | 2-1 부터 다시 |
| `KAKAO_TOKEN_EXCHANGE_FAILED` + `redirect_uri mismatch` | `.env` redirect 와 콘솔 등록값 불일치 | 정확히 같게 |
| `KAKAO_TOKEN_EXCHANGE_FAILED` + `KOE320` | client_id 잘못됨 | REST API 키 다시 확인 |
| `SIGNUP_TOKEN_INVALID` | 10분 지남 | 2-1 부터 다시 |
| `REFRESH_TOKEN_REVOKED` | 이미 사용한 refresh 재사용 | 카카오 로그인부터 다시 |
| DB 연결 오류 | PostgreSQL 미기동/접속정보 | docker / `.env` 확인 |

---

## 4. DB 상태 확인 (선택)

```sql
SELECT id, kakao_id, apple_id, nickname, role, signup_completed, last_login_at FROM users;
SELECT user_id, expires_at, revoked_at FROM refresh_tokens ORDER BY id DESC LIMIT 5;
```

---

## 5. 애플 로그인 테스트

> 자세한 흐름·콘솔 설정은 `docs/apple-login-handoff.md` 참고.

### 5-1. client_secret 생성 검증 (.p8 키가 올바른지)

`.env` 의 `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY_PATH` / `APPLE_SERVICES_ID` /
`APPLE_BUNDLE_ID` 를 채운 뒤:

```bash
npm run gen:apple-secret           # web 용 (sub = Services ID)
npm run gen:apple-secret -- ios    # ios 용 (sub = Bundle ID)
```

ES256 JWT 가 출력되면 .p8/Team ID/Key ID 조합이 정상입니다.
출력된 `client_secret` 으로 애플 토큰 엔드포인트를 직접 두드려 볼 수 있습니다(스크립트가 curl 예시도 출력).

### 5-2. 로그인 엔드포인트

```bash
# 네이티브(iOS): 앱이 ASAuthorization 으로 받은 id_token 전달
curl -X POST http://localhost:3001/api/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "identityToken": "<애플 id_token JWT>",
    "user": { "lastName": "홍", "firstName": "길동" }
  }'

# 웹: authorization code 전달 → 서버가 토큰 교환
curl -X POST http://localhost:3001/api/auth/apple \
  -H "Content-Type: application/json" \
  -d '{ "platform": "web", "authorizationCode": "<애플 code>", "redirectUri": "https://<도메인>/auth/apple/callback" }'
```

응답은 카카오와 동일 구조 — 신규: `{ isNewUser: true, signupToken, appleProfile }`,
기존: `{ isNewUser: false, accessToken, refreshToken, user }`.

신규 가입 완료는 카카오와 동일하게 `POST /auth/apple/complete-signup` (2-3 참고).

> ⚠️ **완전한 end-to-end 테스트는 실기기/실제 Apple ID 가 필요합니다.**
> `identityToken` 은 실제 iOS 기기의 Sign in with Apple 또는 웹 Apple JS 로만 발급됩니다.
> 서버 단위로는 5-1(client_secret 생성)까지가 자동 검증 가능 범위입니다.

### 5-3. 자주 마주치는 애플 에러

| 응답 code | 원인 | 해결 |
|----------|------|------|
| `APPLE_ID_TOKEN_INVALID` + `jwt expired` | id_token 만료(발급 후 ~10분) | 앱에서 재로그인 |
| `APPLE_ID_TOKEN_INVALID` + `jwt audience invalid` | `aud` 불일치 | `.env` 의 `APPLE_BUNDLE_ID`/`APPLE_SERVICES_ID` 확인 |
| `APPLE_TOKEN_EXCHANGE_FAILED` + `invalid_client` | client_secret(JWT) 오류 | Team ID/Key ID/.p8 / `sub`(client_id) 확인 |
| `APPLE_TOKEN_EXCHANGE_FAILED` + `invalid_grant` | code 만료/재사용 또는 redirect_uri 불일치 | 다시 로그인, redirect URI 일치 |
| `APPLE_PRIVATE_KEY_MISSING/UNREADABLE` | .p8 경로 오류 | `APPLE_PRIVATE_KEY_PATH` 확인 |
