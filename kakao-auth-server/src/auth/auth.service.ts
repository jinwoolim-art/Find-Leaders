import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { KakaoService } from './kakao.service';
import { AppleService, ApplePlatform, AppleUserName } from './apple.service';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { User, AuthProvider } from '../users/user.entity';

export interface PublicUser {
  id: number;
  provider: AuthProvider;
  kakaoId: string | null;
  appleId: string | null;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  role: string;
  signupCompleted: boolean;
}

export interface KakaoLoginResult {
  isNewUser: boolean;
  signupToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: PublicUser;
  kakaoProfile?: {
    kakaoId: string;
    nickname: string | null;
    email: string | null;
    profileImageUrl: string | null;
  };
}

export interface AppleLoginResult {
  isNewUser: boolean;
  signupToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: PublicUser;
  appleProfile?: {
    appleId: string;
    name: string | null;
    email: string | null;
  };
}

export interface AppleLoginInput {
  identityToken?: string;
  authorizationCode?: string;
  platform: ApplePlatform;
  user?: AppleUserName;
  nonce?: string;
  redirectUri?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly kakao: KakaoService,
    private readonly apple: AppleService,
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginWithKakaoCode(code: string, redirectUri?: string): Promise<KakaoLoginResult> {
    const tokenRes = await this.kakao.exchangeCodeForToken(code, redirectUri);
    const userRes = await this.kakao.fetchUserInfo(tokenRes.access_token);
    const profile = this.kakao.normalizeProfile(userRes);

    const existing = await this.users.findByKakaoId(profile.kakaoId);

    if (!existing) {
      // 신규: 카카오 정보만 저장(가입 미완료), signup token 발급
      const created = await this.users.upsertKakaoProfile({
        kakaoId: profile.kakaoId,
        email: profile.email,
        nickname: profile.nickname,
        profileImageUrl: profile.profileImageUrl,
      });
      const signupToken = this.jwt.sign(
        { sub: created.id, purpose: 'signup' },
        {
          secret: this.config.getOrThrow<string>('JWT_SIGNUP_SECRET'),
          expiresIn: this.config.get<string>('JWT_SIGNUP_EXPIRES_IN', '10m'),
        },
      );
      return {
        isNewUser: true,
        signupToken,
        kakaoProfile: {
          kakaoId: profile.kakaoId,
          nickname: profile.nickname,
          email: profile.email,
          profileImageUrl: profile.profileImageUrl,
        },
      };
    }

    // 기존: 정보 동기화 + 세션 발급
    const updated = await this.users.upsertKakaoProfile({
      kakaoId: profile.kakaoId,
      email: profile.email,
      nickname: profile.nickname,
      profileImageUrl: profile.profileImageUrl,
    });

    // 가입 미완료 상태로 다시 들어온 경우(과거 신규였는데 가입 안 끝낸 케이스) — signup token 다시 발급
    if (!updated.signupCompleted) {
      const signupToken = this.jwt.sign(
        { sub: updated.id, purpose: 'signup' },
        {
          secret: this.config.getOrThrow<string>('JWT_SIGNUP_SECRET'),
          expiresIn: this.config.get<string>('JWT_SIGNUP_EXPIRES_IN', '10m'),
        },
      );
      return {
        isNewUser: true,
        signupToken,
        kakaoProfile: {
          kakaoId: profile.kakaoId,
          nickname: updated.nickname,
          email: updated.kakaoEmail,
          profileImageUrl: updated.profileImageUrl,
        },
      };
    }

    const session = await this.issueSession(updated);
    return {
      isNewUser: false,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.toPublicUser(updated),
    };
  }

  /**
   * 애플 로그인.
   * - 네이티브(iOS): 앱이 ASAuthorization 으로 받은 `identityToken` 전달
   * - 웹: `authorizationCode` 전달 → 서버가 토큰 교환해 id_token 확보
   * id_token 검증 후, 신규는 signup token / 기존은 세션 발급. (카카오 흐름과 동일)
   */
  async loginWithApple(input: AppleLoginInput): Promise<AppleLoginResult> {
    const clientId = this.apple.resolveClientId(input.platform);

    let idToken = input.identityToken;
    if (!idToken) {
      if (!input.authorizationCode) {
        throw new BadRequestException({ code: 'APPLE_LOGIN_INPUT_MISSING' });
      }
      const tokenRes = await this.apple.exchangeCodeForToken(
        input.authorizationCode,
        clientId,
        input.redirectUri,
      );
      idToken = tokenRes.id_token;
    }

    const claims = await this.apple.verifyIdentityToken(idToken, { nonce: input.nonce });
    const profile = this.apple.normalizeProfile(claims, input.user);

    const existing = await this.users.findByAppleId(profile.appleId);

    if (!existing) {
      // 신규: 애플 정보만 저장(가입 미완료), signup token 발급
      const created = await this.users.upsertAppleProfile({
        appleId: profile.appleId,
        email: profile.email,
        nickname: profile.name,
      });
      return {
        isNewUser: true,
        signupToken: this.signSignupToken(created.id),
        appleProfile: {
          appleId: profile.appleId,
          name: profile.name,
          email: profile.email,
        },
      };
    }

    // 기존: 정보 동기화 (애플은 email/이름을 최초 1회만 주므로 null 은 덮어쓰지 않음)
    const updated = await this.users.upsertAppleProfile({
      appleId: profile.appleId,
      email: profile.email,
      nickname: profile.name,
    });

    // 가입 미완료 상태로 다시 들어온 경우 — signup token 재발급
    if (!updated.signupCompleted) {
      return {
        isNewUser: true,
        signupToken: this.signSignupToken(updated.id),
        appleProfile: {
          appleId: profile.appleId,
          name: updated.nickname,
          email: updated.appleEmail,
        },
      };
    }

    const session = await this.issueSession(updated);
    return {
      isNewUser: false,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.toPublicUser(updated),
    };
  }

  async completeSignup(
    signupToken: string,
    payload: {
      role: 'voter' | 'candidate';
      phone?: string;
      agreeTerms: boolean;
      agreePrivacy: boolean;
      agreeMarketing: boolean;
    },
  ): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
    let userId: number;
    try {
      const decoded = this.jwt.verify<{ sub: number; purpose: string }>(signupToken, {
        secret: this.config.getOrThrow<string>('JWT_SIGNUP_SECRET'),
      });
      if (decoded.purpose !== 'signup') throw new Error('WRONG_PURPOSE');
      userId = decoded.sub;
    } catch {
      throw new UnauthorizedException({ code: 'SIGNUP_TOKEN_INVALID' });
    }

    if (!payload.agreeTerms || !payload.agreePrivacy) {
      throw new BadRequestException({ code: 'REQUIRED_AGREEMENT_MISSING' });
    }

    const user = await this.users.completeSignup(userId, payload);
    const session = await this.issueSession(user);
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.toPublicUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<SessionTokens> {
    const userId = await this.tokens.consumeRefreshToken(refreshToken);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException({ code: 'USER_NOT_FOUND' });
    return this.issueSession(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeByToken(refreshToken);
  }

  private signSignupToken(userId: number): string {
    return this.jwt.sign(
      { sub: userId, purpose: 'signup' },
      {
        secret: this.config.getOrThrow<string>('JWT_SIGNUP_SECRET'),
        expiresIn: this.config.get<string>('JWT_SIGNUP_EXPIRES_IN', '10m'),
      },
    );
  }

  private async issueSession(user: User): Promise<SessionTokens> {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '1h'),
      },
    );
    const refreshToken = await this.tokens.issueRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      provider: user.appleId ? 'apple' : 'kakao',
      kakaoId: user.kakaoId,
      appleId: user.appleId,
      email: user.kakaoEmail ?? user.appleEmail,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      phone: user.phone,
      role: user.role,
      signupCompleted: user.signupCompleted,
    };
  }
}
