import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TokensModule } from './tokens/tokens.module';
import { User } from './users/user.entity';
import { RefreshToken } from './tokens/refresh-token.entity';

function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const dbType = (config.get<string>('DB_TYPE', 'sqlite') || 'sqlite').toLowerCase();
  const entities = [User, RefreshToken];
  const synchronize = config.get<string>('DB_SYNCHRONIZE') === 'true';

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: config.get<string>('DB_HOST', 'localhost'),
      port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      database: config.get<string>('DB_DATABASE'),
      entities,
      synchronize,
      logging: false,
    };
  }

  return {
    type: 'better-sqlite3',
    database: config.get<string>('DB_FILE', './data/dev.sqlite'),
    entities,
    synchronize,
    logging: false,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    AuthModule,
    UsersModule,
    TokensModule,
  ],
})
export class AppModule {}
