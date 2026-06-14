import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {

    if (process.env.NODE_ENV === 'development' && process.env.AUTH_MODE === 'mock') {
      const request = context.switchToHttp().getRequest();
      request.user = {
        id: 'dev-user-123',
        email: 'dev@test.emw',
        firstName: 'Development',
        lastName: 'User',
        role: 'admin',
      };
      this.logger.warn(
        '[JwtAuthGuard] Using MOCK auth user dev-user-123 (AUTH_MODE=mock). Token NOT validated.',
      );
      return true;
    }

    return super.canActivate(context);
  }
}
