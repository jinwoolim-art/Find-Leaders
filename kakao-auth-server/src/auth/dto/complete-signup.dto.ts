import { IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CompleteSignupDto {
  @IsString()
  signupToken: string;

  @IsIn(['voter', 'candidate'])
  role: 'voter' | 'candidate';

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\-+\s()]{7,20}$/, { message: 'phone format invalid' })
  phone?: string;

  @IsBoolean()
  agreeTerms: boolean;

  @IsBoolean()
  agreePrivacy: boolean;

  @IsBoolean()
  agreeMarketing: boolean;
}
