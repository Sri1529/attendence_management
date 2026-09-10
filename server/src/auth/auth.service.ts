import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { RolePermission } from '../roles/entities/role-permission.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  comparePassword,
  compareRefreshToken,
  hashPassword,
  hashRefreshToken,
} from '../common/utils/password.util.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { UsersService } from '../users/users.service.js';

import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    const company = await this.companyRepository.save(
      this.companyRepository.create({
        name: dto.companyName,
        timezone: 'UTC',
        currency: 'USD',
      }),
    );

    const ownerRole = await this.roleRepository.save(
      this.roleRepository.create({
        company_id: company.id,
        name: 'Company Owner',
        is_system: true,
      }),
    );

    const allPermissions = await this.permissionRepository.find();
    for (const perm of allPermissions) {
      await this.rolePermissionRepository.save(
        this.rolePermissionRepository.create({
          role_id: ownerRole.id,
          permission_id: perm.id,
        }),
      );
    }

    const pwdHash = await hashPassword(dto.password);
    const newUser = await this.userRepository.save(
      this.userRepository.create({
        company_id: company.id,
        role_id: ownerRole.id,
        name: dto.name,
        email: dto.email,
        password_hash: pwdHash,
        status: UserStatus.ACTIVE,
      }),
    );

    const freePlan = await this.subscriptionPlanRepository.findOne({
      where: { code: 'FREE' },
    });
    if (freePlan) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await this.subscriptionRepository.save(
        this.subscriptionRepository.create({
          company_id: company.id,
          plan_id: freePlan.id,
          status: SubscriptionStatus.TRIAL,
          trial_start_at: new Date(),
          trial_end_at: trialEnd,
          current_period_start: new Date(),
          current_period_end: trialEnd,
        }),
      );
    }

    await this.auditLogsService.logAction({
      companyId: company.id,
      userId: newUser.id,
      action: 'COMPANY_REGISTER',
      entityType: 'COMPANY',
      entityId: company.id,
      metadata: { companyName: company.name, ownerEmail: newUser.email },
    });

    return this.login({ email: dto.email, password: dto.password });
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await comparePassword(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: user.role_id },
      relations: { permission: true },
    });

    const permissions = rolePermissions
      .map((rp) => rp.permission?.code)
      .filter((code): code is string => !!code);

    const tokens = await this.generateTokens(user.id, user.company_id, user.role_id);
    const refreshTokenHash = await hashRefreshToken(tokens.refreshToken);

    await this.userRepository.update(user.id, {
      refresh_token_hash: refreshTokenHash,
      last_login_at: new Date(),
    });

    await this.auditLogsService.logAction({
      companyId: user.company_id,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return {
      user: this.usersService.sanitizeUser(user),
      permissions,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'fleet_management_refresh_secret_key_development_only_67890',
    );

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type && payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refresh_token_hash')
      .where('user.id = :id', { id: payload.sub })
      .getOne();

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.refresh_token_hash
    ) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }

    const isTokenValid = await compareRefreshToken(
      dto.refreshToken,
      user.refresh_token_hash,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newTokens = await this.generateTokens(user.id, user.company_id, user.role_id);
    const newRefreshTokenHash = await hashRefreshToken(newTokens.refreshToken);

    await this.userRepository.update(user.id, {
      refresh_token_hash: newRefreshTokenHash,
    });

    return newTokens;
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refresh_token_hash: null,
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string, companyId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, company_id: companyId },
      relations: { role: true, company: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: user.role_id },
      relations: { permission: true },
    });

    const permissions = rolePermissions
      .map((rp) => rp.permission?.code)
      .filter((code): code is string => !!code);

    return {
      user: this.usersService.sanitizeUser(user),
      permissions,
    };
  }

  private async generateTokens(userId: string, companyId: string, roleId: string) {
    const payload: JwtPayload = {
      sub: userId,
      companyId,
      roleId,
    };

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'fleet_management_access_secret_key_development_only_12345',
    );
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as any;

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'fleet_management_refresh_secret_key_development_only_67890',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as any;

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' },
      { secret: accessSecret, expiresIn: accessExpiresIn },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh', jti: crypto.randomUUID() },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }
}
