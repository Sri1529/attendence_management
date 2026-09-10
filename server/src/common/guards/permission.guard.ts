import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { PermissionCode } from '../enums/permission-code.enum.js';
import { RequestUser } from '../interfaces/jwt-payload.interface.js';
import { RolePermission } from '../../roles/entities/role-permission.entity.js';
import { Role, RoleStatus } from '../../roles/entities/role.entity.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCode[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user || !user.roleId) {
      throw new ForbiddenException('User context or role missing');
    }

    const role = await this.roleRepository.findOne({
      where: { id: user.roleId, company_id: user.companyId },
    });

    if (!role || role.status !== RoleStatus.ACTIVE) {
      throw new ForbiddenException('User role is inactive or invalid');
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: user.roleId },
      relations: { permission: true },
    });

    const userPermissionCodes = new Set(
      rolePermissions
        .map((rp) => rp.permission?.code)
        .filter((code): code is string => !!code),
    );

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissionCodes.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permission');
    }

    return true;
  }
}
