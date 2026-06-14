import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';

@Module({
  imports: [

    ConfigModule,

    TypeOrmModule.forFeature([User]),

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');

        if (!secret || secret.trim() === '') {

          throw new Error(
            '[FATAL] JWT_SECRET no está definido. Configura la variable de entorno JWT_SECRET antes de iniciar el servidor.',
          );
        }

        const expiresInEnv = config.get<string>('JWT_EXPIRES_IN') ?? '2h';

        return {
          secret,
          signOptions: {

            expiresIn: expiresInEnv as '15m' | '2h' | '1d' | '7d' | number,
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy],

  exports: [AuthService, JwtModule],
})
export class AuthModule { }
