/**
 * Apple client_secret (ES256 JWT) 생성기 — 로컬 검증용.
 *
 * 용도:
 *   1) .p8 키 / Team ID / Key ID 조합이 올바른지 즉시 확인
 *   2) curl 로 애플 토큰/폐기 엔드포인트를 직접 두드려볼 때 client_secret 발급
 *
 * 실행:
 *   npm run gen:apple-secret           # web (Services ID 를 sub 로)
 *   npm run gen:apple-secret -- ios    # ios (Bundle ID 를 sub 로)
 *
 * .env 의 APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY(_PATH) /
 * APPLE_SERVICES_ID / APPLE_BUNDLE_ID 를 사용합니다.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

const ROOT = path.resolve(__dirname, '..');

function loadEnv(): Record<string, string> {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`✗ .env 파일이 없습니다: ${envPath}`);
    process.exit(1);
  }
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function loadPrivateKey(env: Record<string, string>): string {
  if (env.APPLE_PRIVATE_KEY_PATH) {
    const p = path.resolve(ROOT, env.APPLE_PRIVATE_KEY_PATH);
    if (!fs.existsSync(p)) {
      console.error(`✗ .p8 키 파일을 찾을 수 없습니다: ${p}`);
      process.exit(1);
    }
    return fs.readFileSync(p, 'utf8');
  }
  if (env.APPLE_PRIVATE_KEY) return env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.error('✗ APPLE_PRIVATE_KEY_PATH 또는 APPLE_PRIVATE_KEY 가 .env 에 필요합니다');
  process.exit(1);
}

const env = loadEnv();
const platform = (process.argv[2] || 'web').toLowerCase();
const clientId = platform === 'ios' ? env.APPLE_BUNDLE_ID : env.APPLE_SERVICES_ID;

for (const [k, v] of Object.entries({
  APPLE_TEAM_ID: env.APPLE_TEAM_ID,
  APPLE_KEY_ID: env.APPLE_KEY_ID,
  [`client_id(${platform})`]: clientId,
})) {
  if (!v) {
    console.error(`✗ ${k} 값이 비어 있습니다 (.env 확인)`);
    process.exit(1);
  }
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180일 (애플 상한 ~6개월)

let secret: string;
try {
  secret = jwt.sign(
    {
      iss: env.APPLE_TEAM_ID,
      iat: now,
      exp,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    loadPrivateKey(env),
    { algorithm: 'ES256', keyid: env.APPLE_KEY_ID },
  );
} catch (e) {
  console.error('✗ JWT 서명 실패 — .p8 키 형식 또는 Key ID 를 확인하세요');
  console.error('  ' + (e as Error).message);
  process.exit(1);
}

console.log(`\n✓ client_secret 생성 완료  (platform=${platform}, client_id=${clientId})`);
console.log('─'.repeat(72));
console.log(secret);
console.log('─'.repeat(72));
console.log(`만료: ${new Date(exp * 1000).toISOString()}`);
console.log('\n애플 토큰 엔드포인트 검증 예시 (code 는 실제 authorization code 로 교체):');
console.log(`
  SECRET='${secret}'
  curl -X POST https://appleid.apple.com/auth/token \\
    -d client_id='${clientId}' \\
    -d client_secret="$SECRET" \\
    -d code='APPLE_AUTHORIZATION_CODE' \\
    -d grant_type=authorization_code
`);
