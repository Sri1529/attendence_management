import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service.js';
import { User, UserStatus } from '../../users/entities/user.entity.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const url = request.originalUrl || request.url || '';

    if (
      url.startsWith('/auth') ||
      url.startsWith('/subscription') ||
      url.startsWith('/audit-logs') ||
      url.startsWith('/health')
    ) {
      return true;
    }

    let user = request.user;

    if (!user && request.headers.authorization) {
      const authHeader = request.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const secret = this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'fleet_management_access_secret_key_development_only_12345',
        );
        try {
          const payload: JwtPayload = await this.jwtService.verifyAsync(
            token,
            { secret },
          );
          if (payload.sub) {
            const dbUser = await this.userRepository.findOne({
              where: { id: payload.sub },
            });
            if (dbUser && dbUser.status === UserStatus.ACTIVE) {
              user = {
                userId: dbUser.id,
                companyId: dbUser.company_id,
                roleId: dbUser.role_id,
              };
              request.user = user;
            }
          }
        } catch {
          return true;
        }
      }
    }

    if (!user || !user.companyId) {
      return true;
    }

    const subInfo = await this.subscriptionsService.getCompanySubscription(
      user.companyId,
    );

    if (!subInfo.accessAllowed) {
      throw new ForbiddenException(
        'Subscription required or expired. Business operations are restricted.',
      );
    }

    return true;
  }
}
