import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole = 'voter' | 'candidate' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type AuthProvider = 'kakao' | 'apple';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // 카카오/애플 둘 다 nullable — 사용자는 한쪽 프로바이더로만 가입.
  // NULL 은 unique 인덱스에서 서로 중복으로 보지 않음(Postgres/SQLite 공통).
  @Index({ unique: true })
  @Column({ name: 'kakao_id', type: 'varchar', length: 50, nullable: true })
  kakaoId: string | null;

  @Column({ name: 'kakao_email', type: 'varchar', length: 255, nullable: true })
  kakaoEmail: string | null;

  @Index({ unique: true })
  @Column({ name: 'apple_id', type: 'varchar', length: 255, nullable: true })
  appleId: string | null;

  @Column({ name: 'apple_email', type: 'varchar', length: 255, nullable: true })
  appleEmail: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'voter' })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: UserStatus;

  @Column({ name: 'agree_terms', type: 'boolean', default: false })
  agreeTerms: boolean;

  @Column({ name: 'agree_privacy', type: 'boolean', default: false })
  agreePrivacy: boolean;

  @Column({ name: 'agree_marketing', type: 'boolean', default: false })
  agreeMarketing: boolean;

  @Column({ name: 'signup_completed', type: 'boolean', default: false })
  signupCompleted: boolean;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
