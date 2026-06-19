import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';
const KAKAO_UNLINK_URL = 'https://kapi.kakao.com/v1/user/unlink';

export interface KakaoTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope?: string;
}

export interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    email_needs_agreement?: boolean;
    has_email?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    phone_number?: string;
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
}

export interface NormalizedKakaoProfile {
  kakaoId: string;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  phone: string | null;
}

@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);

  constructor(private readonly config: ConfigService) {}

  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
  ): Promise<KakaoTokenResponse> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', this.config.getOrThrow<string>('KAKAO_REST_API_KEY'));
    params.append(
      'redirect_uri',
      redirectUri ?? this.config.getOrThrow<string>('KAKAO_REDIRECT_URI'),
    );
    params.append('code', code);
    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET');
    if (clientSecret) params.append('client_secret', clientSecret);

    try {
      const { data } = await axios.post<KakaoTokenResponse>(KAKAO_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        timeout: 5000,
      });
      return data;
    } catch (err) {
      const e = err as AxiosError;
      this.logger.error('Kakao token exchange failed', e.response?.data ?? e.message);
      throw new HttpException(
        { code: 'KAKAO_TOKEN_EXCHANGE_FAILED', detail: e.response?.data ?? e.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async fetchUserInfo(accessToken: string): Promise<KakaoUserResponse> {
    try {
      const { data } = await axios.get<KakaoUserResponse>(KAKAO_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
      });
      return data;
    } catch (err) {
      const e = err as AxiosError;
      this.logger.error('Kakao user info fetch failed', e.response?.data ?? e.message);
      throw new HttpException(
        { code: 'KAKAO_USER_INFO_FAILED', detail: e.response?.data ?? e.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  normalizeProfile(raw: KakaoUserResponse): NormalizedKakaoProfile {
    const account = raw.kakao_account;
    const profile = account?.profile ?? raw.properties;
    return {
      kakaoId: String(raw.id),
      email: account?.email ?? null,
      nickname: profile?.nickname ?? null,
      profileImageUrl:
        account?.profile?.profile_image_url ?? raw.properties?.profile_image ?? null,
      phone: account?.phone_number ?? null,
    };
  }

  async unlink(accessToken: string): Promise<void> {
    try {
      await axios.post(
        KAKAO_UNLINK_URL,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000,
        },
      );
    } catch (err) {
      const e = err as AxiosError;
      this.logger.warn('Kakao unlink failed', e.response?.data ?? e.message);
    }
  }
}
