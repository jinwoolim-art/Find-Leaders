import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

// 애플 client_secret(JWT) 만료 최대치는 15777000초(약 6개월). 안전하게 180일.
const CLIENT_SECRET_TTL_SEC = 60 * 60 * 24 * 180;

export type ApplePlatform = 'ios' | 'web';

/** 애플 id_token(JWT) 의 페이로드 클레임 */
export interface AppleIdTokenClaims {
  iss: string;
  sub: string; // 애플의 안정적 고유 사용자 ID — 우리 쪽 appleId
  aud: string;
  iat: number;
  exp: number;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string; // 애플 이메일 가리기(릴레이) 사용 여부
  nonce?: string;
  nonce_supported?: boolean;
  real_user_status?: number;
}

export interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

/** 클라이언트가 최초 1회 로그인 시에만 넘겨주는 이름 */
export interface AppleUserName {
  firstName?: string;
  lastName?: string;
}

export interface NormalizedAppleProfile {
  appleId: string;
  email: string | null;
  name: string | null;
  isPrivateEmail: boolean;
}

@Injectable()
export class AppleService {
  private readonly logger = new Logger(AppleService.name);

  // 애플 공개키(JWKS) — id_token 서명 검증용. 24h 캐시.
  private readonly jwks = new JwksClient({
    jwksUri: APPLE_KEYS_URL,
    cache: true,
    cacheMaxAge: 24 * 60 * 60 * 1000,
    rateLimit: true,
    timeout: 5000,
  });

  constructor(private readonly config: ConfigService) {}

  /**
   * 플랫폼별 client_id 결정.
   * - ios: 앱의 Bundle ID (네이티브 Sign in with Apple)
   * - web: Services ID (웹 OAuth)
   * id_token 의 `aud`, 그리고 code 교환 시 client_secret 의 `sub` 가 이 값이어야 합니다.
   */
  resolveClientId(platform: ApplePlatform): string {
    return this.requireConfig(
      platform === 'web' ? 'APPLE_SERVICES_ID' : 'APPLE_BUNDLE_ID',
    );
  }

  /** id_token 의 aud 로 허용되는 모든 client_id (ios + web) */
  private allowedAudiences(): [string, ...string[]] {
    const auds = [
      this.config.get<string>('APPLE_BUNDLE_ID'),
      this.config.get<string>('APPLE_SERVICES_ID'),
    ].filter((v): v is string => !!v);
    if (auds.length === 0) {
      throw new HttpException(
        { code: 'APPLE_CONFIG_MISSING', detail: 'APPLE_BUNDLE_ID / APPLE_SERVICES_ID' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return auds as [string, ...string[]];
  }

  /** Apple 설정값 조회 — 누락 시 generic 500 대신 진단 가능한 에러 */
  private requireConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new HttpException(
        { code: 'APPLE_CONFIG_MISSING', detail: key },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return value;
  }

  /**
   * 애플 id_token 검증 → 클레임 반환.
   * 1) JWKS 에서 kid 에 맞는 공개키 조회 → 2) RS256 서명 검증
   * 3) iss/aud/exp 검증 → 4) (옵션) nonce 일치 검증
   */
  async verifyIdentityToken(
    idToken: string,
    opts: { nonce?: string } = {},
  ): Promise<AppleIdTokenClaims> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new HttpException(
        { code: 'APPLE_ID_TOKEN_MALFORMED' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let publicKey: string;
    try {
      const signingKey = await this.jwks.getSigningKey(decoded.header.kid);
      publicKey = signingKey.getPublicKey();
    } catch (err) {
      const e = err as Error;
      // kid 가 애플 JWKS 에 없음 → 위조/만료 토큰 (클라이언트 잘못 → 401)
      if (e.name === 'SigningKeyNotFoundError') {
        this.logger.warn('Apple JWKS: unknown kid', decoded.header.kid);
        throw new HttpException(
          { code: 'APPLE_ID_TOKEN_INVALID', detail: 'unknown signing key' },
          HttpStatus.UNAUTHORIZED,
        );
      }
      // 네트워크/서버 장애 → 502
      this.logger.error('Apple JWKS lookup failed', e.message);
      throw new HttpException(
        { code: 'APPLE_JWKS_UNAVAILABLE' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    let claims: AppleIdTokenClaims;
    try {
      claims = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: this.allowedAudiences(),
      }) as AppleIdTokenClaims;
    } catch (err) {
      this.logger.warn('Apple id_token verification failed', (err as Error).message);
      throw new HttpException(
        { code: 'APPLE_ID_TOKEN_INVALID', detail: (err as Error).message },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // nonce 재생공격 방지 — 클라이언트가 nonce 를 보냈을 때만 검증
    if (opts.nonce && claims.nonce !== opts.nonce) {
      throw new HttpException(
        { code: 'APPLE_NONCE_MISMATCH' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return claims;
  }

  /**
   * authorization_code → 토큰 교환.
   * - 웹: redirectUri 가 콘솔 등록값과 정확히 일치해야 함
   * - 네이티브(iOS): redirectUri 생략
   * 응답의 id_token 을 검증용으로, refresh_token 을 (선택)회원탈퇴 시 폐기용으로 사용.
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri?: string,
  ): Promise<AppleTokenResponse> {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', this.generateClientSecret(clientId));
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    if (redirectUri) params.append('redirect_uri', redirectUri);

    try {
      const { data } = await axios.post<AppleTokenResponse>(APPLE_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      });
      return data;
    } catch (err) {
      const e = err as AxiosError;
      this.logger.error('Apple token exchange failed', e.response?.data ?? e.message);
      throw new HttpException(
        { code: 'APPLE_TOKEN_EXCHANGE_FAILED', detail: e.response?.data ?? e.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 회원 탈퇴 시 애플 토큰 폐기 (App Store 가이드 5.1.1(v) 준수).
   * code 교환으로 받은 refresh_token 을 저장해 두었다가 호출합니다.
   */
  async revokeToken(
    token: string,
    clientId: string,
    tokenTypeHint: 'refresh_token' | 'access_token' = 'refresh_token',
  ): Promise<void> {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', this.generateClientSecret(clientId));
    params.append('token', token);
    params.append('token_type_hint', tokenTypeHint);

    try {
      await axios.post(APPLE_REVOKE_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      });
    } catch (err) {
      const e = err as AxiosError;
      this.logger.warn('Apple token revoke failed', e.response?.data ?? e.message);
    }
  }

  /**
   * 애플 client_secret 생성 — .p8 키로 ES256 서명한 JWT.
   * code 교환 / 토큰 폐기에 사용. (검증 전용 네이티브 흐름에서는 불필요)
   */
  generateClientSecret(clientId: string): string {
    const teamId = this.requireConfig('APPLE_TEAM_ID');
    const keyId = this.requireConfig('APPLE_KEY_ID');
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        iss: teamId,
        iat: now,
        exp: now + CLIENT_SECRET_TTL_SEC,
        aud: APPLE_ISSUER,
        sub: clientId,
      },
      this.loadPrivateKey(),
      { algorithm: 'ES256', keyid: keyId },
    );
  }

  /** Sign in with Apple Key 의 .p8 개인키 로드 — 파일 경로 우선, 없으면 인라인 env */
  private loadPrivateKey(): string {
    const path = this.config.get<string>('APPLE_PRIVATE_KEY_PATH');
    if (path) {
      try {
        return fs.readFileSync(path, 'utf8');
      } catch {
        throw new HttpException(
          { code: 'APPLE_PRIVATE_KEY_UNREADABLE', detail: path },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    const inline = this.config.get<string>('APPLE_PRIVATE_KEY');
    if (inline) return inline.replace(/\\n/g, '\n');

    throw new HttpException(
      { code: 'APPLE_PRIVATE_KEY_MISSING' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * id_token 클레임 + (최초 1회만 오는)이름 → 정규화 프로필.
   * 이름은 한국식으로 성(lastName)+이름(firstName) 순서로 합칩니다.
   */
  normalizeProfile(
    claims: AppleIdTokenClaims,
    user?: AppleUserName,
  ): NormalizedAppleProfile {
    return {
      appleId: String(claims.sub),
      email: claims.email ?? null,
      name: this.buildName(user),
      isPrivateEmail:
        claims.is_private_email === true || claims.is_private_email === 'true',
    };
  }

  private buildName(user?: AppleUserName): string | null {
    if (!user) return null;
    const joined = [user.lastName, user.firstName].filter(Boolean).join('');
    return joined.length > 0 ? joined : null;
  }
}
