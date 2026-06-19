import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issueRefreshToken(userId: number): Promise<string> {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '14d');
    const token = this.jwt.sign(
      { sub: userId, purpose: 'refresh' },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn },
    );
    const expiresAt = new Date(Date.now() + this.parseExpiresIn(expiresIn));
    await this.repo.save(
      this.repo.create({
        userId,
        tokenHash: this.hash(token),
        expiresAt,
      }),
    );
    return token;
  }

  async consumeRefreshToken(token: string): Promise<number> {
    let payload: { sub: number; purpose: string };
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }
    if (payload.purpose !== 'refresh') {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }
    const record = await this.repo.findOne({
      where: { tokenHash: this.hash(token), userId: payload.sub },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_REVOKED' });
    }
    record.revokedAt = new Date();
    await this.repo.save(record);
    return payload.sub;
  }

  async revokeByToken(token: string): Promise<void> {
    const record = await this.repo.findOne({ where: { tokenHash: this.hash(token) } });
    if (record && !record.revokedAt) {
      record.revokedAt = new Date();
      await this.repo.save(record);
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.repo.update({ userId, revokedAt: null as never }, { revokedAt: new Date() });
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 14 * 24 * 60 * 60 * 1000;
    const num = parseInt(match[1], 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return num * multipliers[match[2]];
  }
}
