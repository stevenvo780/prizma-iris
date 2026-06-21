import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfig {
  constructor(private configService: ConfigService) {}

  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        '⚠️ SEGURIDAD: JWT_SECRET debe tener al menos 32 caracteres y estar configurado en variables de entorno'
      );
    }
    return secret;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '24h');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get bcryptRounds(): number {
    return this.configService.get<number>('BCRYPT_ROUNDS', 12);
  }

  get rateLimitTtl(): number {
    return this.configService.get<number>('RATE_LIMIT_TTL', 60);
  }

  get rateLimitLimit(): number {
    return this.configService.get<number>('RATE_LIMIT_LIMIT', 100);
  }

  get sessionSecret(): string {
    const secret = this.configService.get<string>('SESSION_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        '⚠️ SEGURIDAD: SESSION_SECRET debe tener al menos 32 caracteres y estar configurado en variables de entorno'
      );
    }
    return secret;
  }

  get passwordResetExpiry(): number {
    return this.configService.get<number>('PASSWORD_RESET_EXPIRY_MINUTES', 15);
  }

  get maxLoginAttempts(): number {
    return this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
  }

  get lockoutDuration(): number {
    return this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30);
  }

  get tokenValidationUrl(): string {
    return this.configService.get<string>('TOKEN_VALIDATION_URL', '/auth/validate');
  }

  get allowedOrigins(): string[] {
    const origins = this.configService.get<string>(
      'ALLOWED_ORIGINS',
      'http://localhost:3000,http://localhost:3005',
    );
    return origins.split(',').map(origin => origin.trim());
  }

  get cookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  } {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  get jwtOptions() {
    return {
      secret: this.jwtSecret,
      signOptions: {
        expiresIn: this.jwtExpiresIn,
        issuer: 'iris-unified-api',
        audience: 'iris-clients',
      },
    };
  }

  get jwtRefreshOptions() {
    return {
      secret: this.jwtSecret + '-refresh',
      signOptions: {
        expiresIn: this.jwtRefreshExpiresIn,
        issuer: 'iris-unified-api',
        audience: 'iris-clients',
      },
    };
  }
}
