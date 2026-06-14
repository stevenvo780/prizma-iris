import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = Number(this.configService.get<string>('DB_PORT', '5432')) || 5432;
    const username = String(this.configService.get<string>('DB_USERNAME', 'usuarionodo'));
    const passwordRaw = this.configService.get('DB_PASSWORD');
    const password = typeof passwordRaw === 'string' ? passwordRaw : String(passwordRaw ?? '');
    const database = String(this.configService.get<string>('DB_DATABASE', 'NodoDB'));

    // eslint-disable-next-line no-console
    console.log('[DatabaseConfig]', {
      host,
      port,
      username,
      database,
      passwordType: typeof passwordRaw,
      passwordLen: typeof password === 'string' ? password.length : 'n/a',
    });

    console.log('[DB EFFECTIVE]', {
      type: 'postgres',
      host,
      port,
      username,
      database,
      hasPassword: Boolean(password),
    });

    return {
      type: 'postgres',
      host,
      port: port as any,
      username,
      password,
      database,
      entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize:
        (this.configService.get<string>('DB_SYNCHRONIZE', 'false') || 'false').toString() ===
        'true',
      logging:
        (this.configService.get<string>('DB_LOGGING', 'false') || 'false').toString() === 'true',
      ssl:
        (this.configService.get<string>('DB_SSL', 'false') || 'false').toString() === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
    } as TypeOrmModuleOptions;
  }
}
