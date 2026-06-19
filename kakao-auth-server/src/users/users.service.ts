import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

export interface KakaoProfile {
  kakaoId: string;
  email?: string | null;
  nickname?: string | null;
  profileImageUrl?: string | null;
}

export interface AppleProfile {
  appleId: string;
  email?: string | null;
  nickname?: string | null;
}

export interface CompleteSignupInput {
  role: Exclude<UserRole, 'admin'>;
  phone?: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  findByKakaoId(kakaoId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { kakaoId } });
  }

  findByAppleId(appleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { appleId } });
  }

  async upsertKakaoProfile(profile: KakaoProfile): Promise<User> {
    const existing = await this.findByKakaoId(profile.kakaoId);
    if (existing) {
      existing.kakaoEmail = profile.email ?? existing.kakaoEmail;
      existing.nickname = profile.nickname ?? existing.nickname;
      existing.profileImageUrl = profile.profileImageUrl ?? existing.profileImageUrl;
      existing.lastLoginAt = new Date();
      return this.userRepo.save(existing);
    }
    const user = this.userRepo.create({
      kakaoId: profile.kakaoId,
      kakaoEmail: profile.email ?? null,
      nickname: profile.nickname ?? null,
      profileImageUrl: profile.profileImageUrl ?? null,
      lastLoginAt: new Date(),
    });
    return this.userRepo.save(user);
  }

  /**
   * 애플 프로필 upsert.
   * ⚠️ 애플은 email/이름을 **최초 인가 1회**만 내려줍니다. 재로그인 시 id_token 에
   * email 이 없을 수 있으므로 null 로 기존 값을 덮어쓰지 않습니다(`?? existing`).
   */
  async upsertAppleProfile(profile: AppleProfile): Promise<User> {
    const existing = await this.findByAppleId(profile.appleId);
    if (existing) {
      existing.appleEmail = profile.email ?? existing.appleEmail;
      existing.nickname = profile.nickname ?? existing.nickname;
      existing.lastLoginAt = new Date();
      return this.userRepo.save(existing);
    }
    const user = this.userRepo.create({
      appleId: profile.appleId,
      appleEmail: profile.email ?? null,
      nickname: profile.nickname ?? null,
      lastLoginAt: new Date(),
    });
    return this.userRepo.save(user);
  }

  async completeSignup(id: number, data: CompleteSignupInput): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    user.role = data.role;
    user.phone = data.phone ?? user.phone;
    user.agreeTerms = data.agreeTerms;
    user.agreePrivacy = data.agreePrivacy;
    user.agreeMarketing = data.agreeMarketing;
    user.signupCompleted = true;
    return this.userRepo.save(user);
  }
}
