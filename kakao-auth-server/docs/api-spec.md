# 카카오 로그인 API 명세

> 프론트엔드 ↔ 백엔드 인터페이스 합의 문서.
> Base URL: `http://localhost:3001/api` (운영 시 변경)

---

## 1. 전체 흐름

```
[Frontend]  카카오 로그인 버튼 클릭
   ↓
[Kakao]    https://kauth.kakao.com/oauth/authorize  (사용자 동의화면)
   ↓
[Frontend] redirect_uri 로 ?code=xxxx 받음
   ↓ POST /auth/kakao { code }
[Backend]  카카오 토큰 교환 → 사용자 정보 조회 → DB upsert
   ↓
   ├─ 신규: { isNewUser: true, signupToken, kakaoProfile }
   │        → [Frontend] 약관 동의 + 역할 + 전화번호 화면
   │        → POST /auth/kakao/complete-signup { signupToken, ... }
   │        → { accessToken, refreshToken, user }
   │
   └─ 기존: { isNewUser: false, accessToken, refreshToken, user }
```

---

## 2. 엔드포인트

### `POST /auth/kakao` — 카카오 로그인

**Request**
```json
{
  "code": "kakao-authorization-code",
  "redirectUri": "http://localhost:5500/auth/kakao/callback"
}
```
`redirectUri` 는 선택. 생략 시 서버 `.env` 의 `KAKAO_REDIRECT_URI` 사용.
프론트에서 환경별 redirect URI 를 보내고 싶을 때 사용.

**Response 200 — 기존 사용자 (로그인 완료)**
```json
{
  "isNewUser": false,
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "12",
    "kakaoId": "1234567890",
    "email": "hong@example.com",
    "nickname": "홍길동",
    "profileImageUrl": "https://k.kakaocdn.net/...",
    "phone": "010-1234-5678",
    "role": "voter",
    "signupCompleted": true
  }
}
```

**Response 200 — 신규 사용자 (가입 미완료)**
```json
{
  "isNewUser": true,
  "signupToken": "eyJhbGci...",
  "kakaoProfile": {
    "kakaoId": "1234567890",
    "nickname": "홍길동",
    "email": "hong@example.com",
    "profileImageUrl": "https://k.kakaocdn.net/..."
  }
}
```
`signupToken` 은 10분 만료. `/auth/kakao/complete-signup` 호출 시 사용.

**Error**
| Status | code                          | 의미 |
|--------|-------------------------------|------|
| 502    | `KAKAO_TOKEN_EXCHANGE_FAILED` | 카카오 토큰 발급 실패(코드 만료/잘못된 redirect URI) |
| 502    | `KAKAO_USER_INFO_FAILED`      | 카카오 사용자 정보 조회 실패 |

---

### `POST /auth/kakao/complete-signup` — 가입 완료

**Request**
```json
{
  "signupToken": "eyJhbGci...",
  "role": "voter",
  "phone": "010-1234-5678",
  "agreeTerms": true,
  "agreePrivacy": true,
  "agreeMarketing": false
}
```
- `role`: `"voter"` | `"candidate"`
- `phone`: 선택 (카카오 권한 통과 후엔 자동 입력 가능)
- `agreeTerms`, `agreePrivacy`: **필수 true**

**Response 200**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { ... PublicUser ... }
}
```

**Error**
| Status | code                          | 의미 |
|--------|-------------------------------|------|
| 401    | `SIGNUP_TOKEN_INVALID`        | 토큰 만료/위변조 |
| 400    | `REQUIRED_AGREEMENT_MISSING`  | 이용약관·개인정보 동의 필수 |

---

### `POST /auth/refresh` — 토큰 재발급

**Request**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Response 200**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```
> ⚠️ Refresh rotation: 응답으로 받은 **새 refresh 토큰**으로 교체해야 함.
> 직전 refresh 토큰은 즉시 폐기됨(`revoked_at` 채워짐).

**Error**
| Status | code                      | 의미 |
|--------|---------------------------|------|
| 401    | `REFRESH_TOKEN_INVALID`   | 토큰 위변조/만료 |
| 401    | `REFRESH_TOKEN_REVOKED`   | 이미 사용/폐기됨 (재로그인 필요) |

---

### `POST /auth/logout`

**Request**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Response 204** — 본문 없음.
서버가 해당 refresh 토큰을 폐기. access 토큰은 자체 만료 시까지 유효(짧게 1h).

---

### `GET /auth/me` — 현재 로그인 사용자 조회

**Header**
```
Authorization: Bearer {accessToken}
```

**Response 200**
```json
{
  "id": "12",
  "kakaoId": "1234567890",
  "email": "hong@example.com",
  "nickname": "홍길동",
  "profileImageUrl": "https://...",
  "phone": "010-1234-5678",
  "role": "voter",
  "signupCompleted": true
}
```

**Error**
| Status | code              | 의미 |
|--------|-------------------|------|
| 401    | (Passport 기본)   | accessToken 없음/만료/위변조 |
| 404    | `USER_NOT_FOUND`  | 사용자 삭제됨 |

---

## 3. 토큰 정책

| 토큰        | 만료 (기본)  | 저장 위치                          |
|-------------|--------------|------------------------------------|
| access      | `1h`         | 메모리 / 클라이언트 변수            |
| refresh     | `14d`        | httpOnly 쿠키 권장 (또는 secure storage) |
| signup      | `10m`        | 메모리 (1회용)                      |

**클라이언트 권장 동작**
- accessToken 으로 모든 보호 API 호출. 401 받으면 `/auth/refresh` 시도 → 새 토큰으로 재시도.
- `/auth/refresh` 도 401 이면 → 카카오 로그인부터 다시.

---

## 4. PublicUser 스키마 (참고)

```ts
{
  id: string;                 // bigint stringified
  kakaoId: string;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  role: 'voter' | 'candidate' | 'admin';
  signupCompleted: boolean;
}
```
