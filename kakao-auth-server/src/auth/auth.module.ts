import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KakaoService } from './kakao.service';
import { AppleService } from './apple.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets/expiresIn은 호출 시점에 주입 (access/refresh/signup 분리)
    UsersModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, KakaoService, AppleService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
