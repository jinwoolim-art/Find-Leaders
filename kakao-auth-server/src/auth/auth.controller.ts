import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  // 카카오 인가코드 → 로그인 or 신규 가입 토큰 발급
  @Post('kakao')
  @HttpCode(200)
  kakaoLogin(@Body() dto: KakaoLoginDto) {
    return this.auth.loginWithKakaoCode(dto.code, dto.redirectUri);
  }

  // 신규 사용자가 약관 동의 + 역할 + 전화번호 입력하고 가입 완료
  @Post('kakao/complete-signup')
  @HttpCode(200)
  completeSignup(@Body() dto: CompleteSignupDto) {
    const { signupToken, ...rest } = dto;
    return this.auth.completeSignup(signupToken, rest);
  }

  // 애플 id_token(네이티브) 또는 authorization code(웹) → 로그인 or 신규 가입 토큰 발급
  @Post('apple')
  @HttpCode(200)
  appleLogin(@Body() dto: AppleLoginDto) {
    return this.auth.loginWithApple({
      identityToken: dto.identityToken,
      authorizationCode: dto.authorizationCode,
      platform: dto.platform ?? 'ios',
      user: dto.user,
      nonce: dto.nonce,
      redirectUri: dto.redirectUri,
    });
  }

  // 애플 신규 사용자 가입 완료 (signup token 은 프로바이더 무관 — 카카오와 동일 핸들러)
  @Post('apple/complete-signup')
  @HttpCode(200)
  appleCompleteSignup(@Body() dto: CompleteSignupDto) {
    const { signupToken, ...rest } = dto;
    return this.auth.completeSignup(signupToken, rest);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { sub: number } }) {
    const user = await this.users.findById(req.user.sub);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    return this.auth.toPublicUser(user);
  }
}
