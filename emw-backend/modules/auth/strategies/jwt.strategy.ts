import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * payload = el contenido del JWT decodificado, por ejemplo:
   * {
   *   sub: 'd1e41474-d0be-4e87-baf4-1d71a5e2571d',
   *   email: 'test22@example.com',
   *   role: 'user',
   *   iat: 1761859648,
   *   exp: 1761866848,
   *   jti: '050e4f95-996b-4533-a3c9-2b6e5cfb77f3'
   * }
   */
  async validate(payload: any) {

    let dbUser: any;
    try {
      dbUser = await this.authService.validateUser(payload.sub);

    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: dbUser?.id ?? payload.sub,
      email: dbUser?.email ?? payload.email,
      role: dbUser?.role ?? payload.role,

      firstName: dbUser?.firstName ?? payload.firstName ?? null,
      lastName: dbUser?.lastName ?? payload.lastName ?? null,
    };
  }
}
