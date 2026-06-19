import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** 애플이 최초 1회 로그인 시에만 내려주는 이름. 클라이언트가 평탄화해서 전달. */
export class AppleUserNameDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class AppleLoginDto {
  // 네이티브(iOS): ASAuthorization 으로 받은 id_token
  @IsOptional()
  @IsString()
  @MinLength(1)
  identityToken?: string;

  // 웹: OAuth authorization code. 네이티브에서도 회원탈퇴용 refresh_token 확보 목적으로 함께 보낼 수 있음.
  @IsOptional()
  @IsString()
  @MinLength(1)
  authorizationCode?: string;

  // client_id(aud) 결정용. ios=Bundle ID, web=Services ID. 생략 시 ios.
  @IsOptional()
  @IsIn(['ios', 'web'])
  platform?: 'ios' | 'web';

  // 최초 로그인 1회만 존재
  @IsOptional()
  @ValidateNested()
  @Type(() => AppleUserNameDto)
  user?: AppleUserNameDto;

  // 재생공격 방지용 nonce (클라이언트가 사용했을 때만)
  @IsOptional()
  @IsString()
  nonce?: string;

  // 웹 code 교환 시 콘솔 등록값과 일치해야 하는 redirect URI
  @IsOptional()
  @IsString()
  redirectUri?: string;
}
