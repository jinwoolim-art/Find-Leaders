-- ─────────────────────────────────────────────────────────────
-- 일꾼을묻다 — 소셜 로그인 DB 스키마 (PostgreSQL) — 카카오 + 애플
--
-- TypeORM synchronize=true 면 자동 생성됩니다.
-- 운영에서는 synchronize=false 로 두고 이 SQL을 마이그레이션으로 적용.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                  BIGSERIAL PRIMARY KEY,
  -- kakao_id / apple_id 둘 다 nullable + UNIQUE.
  -- 사용자는 한 프로바이더로만 가입. UNIQUE 컬럼의 NULL 은 서로 중복 아님.
  kakao_id            VARCHAR(50)  UNIQUE,
  kakao_email         VARCHAR(255),
  apple_id            VARCHAR(255) UNIQUE,
  apple_email         VARCHAR(255),
  nickname            VARCHAR(100),
  profile_image_url   TEXT,
  phone               VARCHAR(20),
  role                VARCHAR(20)  NOT NULL DEFAULT 'voter',
  status              VARCHAR(20)  NOT NULL DEFAULT 'active',
  agree_terms         BOOLEAN      NOT NULL DEFAULT FALSE,
  agree_privacy       BOOLEAN      NOT NULL DEFAULT FALSE,
  agree_marketing     BOOLEAN      NOT NULL DEFAULT FALSE,
  signup_completed    BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_provider CHECK (kakao_id IS NOT NULL OR apple_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

-- 이미 카카오용 users 테이블이 있는 경우 — 애플 컬럼만 추가:
--   ALTER TABLE users ALTER COLUMN kakao_id DROP NOT NULL;
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id    VARCHAR(255) UNIQUE;
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_email VARCHAR(255);
--   CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash    ON refresh_tokens(token_hash);

-- ─────────────────────────────────────────────────────────────
-- 컬럼 의미
-- ─────────────────────────────────────────────────────────────
-- kakao_id/apple_id : 둘 중 하나만 채워짐(가입에 쓴 프로바이더). 둘 다 UNIQUE.
-- apple_id          : 애플 id_token 의 sub (안정적 고유 ID, 약 44자)
-- apple_email       : 애플은 최초 1회만 내려줌. 릴레이(가린 메일)일 수 있음.
-- role             : 'voter' | 'candidate' | 'admin'
-- status           : 'active' | 'suspended' | 'deleted'
-- signup_completed : 소셜 로그인 후 약관·역할 입력까지 끝났는지
-- token_hash       : refresh JWT 의 sha256 (원본 JWT 는 저장 X)
-- revoked_at       : 1회용 — 사용/로그아웃 시점에 채워짐 (refresh rotation)
