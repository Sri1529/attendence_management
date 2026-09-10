import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRoleStatusDto } from './dto/update-role-status.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(companyId: string, dto: CreateRoleDto, actorId?: string) {
    const existing = await this.roleRepository.findOne({
      where: { company_id: companyId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Role with this name already exists');
    }

    const role = this.roleRepository.create({
      company_id: companyId,
      name: dto.name,
      description: dto.description,
      is_system: false,
    });

    const savedRole = await this.roleRepository.save(role);

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.assignPermissions(companyId, savedRole.id, {
        permissionIds: dto.permissionIds,
      }, actorId);
    }

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'ROLE_CREATE',
      entityType: 'ROLE',
      entityId: savedRole.id,
      metadata: { name: savedRole.name },
    });

    return this.findOne(companyId, savedRole.id);
  }

  async findAll(companyId: string) {
    const roles = await this.roleRepository.find({
      where: { company_id: companyId },
      order: { name: 'ASC' },
    });

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const rolePermissions = await this.rolePermissionRepository.find({
          where: { role_id: role.id },
          relations: { permission: true },
        });
        return {
          ...role,
          permissions: rolePermissions.map((rp) => rp.permission),
        };
      }),
    );

    return rolesWithPermissions;
  }

  async findOne(companyId: string, id: string) {
    const role = await this.roleRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: role.id },
      relations: { permission: true },
    });

    return {
      ...role,
      permissions: rolePermissions.map((rp) => rp.permission),
    };
  }

  async update(companyId: string, id: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.roleRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new ForbiddenException('Cannot modify system role');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { company_id: companyId, name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('Role with this name already exists');
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    const saved = await this.roleRepository.save(role);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'ROLE_UPDATE',
      entityType: 'ROLE',
      entityId: saved.id,
      metadata: { name: saved.name },
    });

    return this.findOne(companyId, id);
  }

  async updateStatus(companyId: string, id: string, dto: UpdateRoleStatusDto, actorId?: string) {
    const role = await this.roleRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new ForbiddenException('Cannot modify status of system role');
    }

    role.status = dto.status;
    const saved = await this.roleRepository.save(role);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'ROLE_STATUS_UPDATE',
      entityType: 'ROLE',
      entityId: saved.id,
      metadata: { name: saved.name, status: saved.status },
    });

    return this.findOne(companyId, id);
  }

  async assignPermissions(
    companyId: string,
    id: string,
    dto: AssignPermissionsDto,
    actorId?: string,
  ) {
    const role = await this.roleRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findBy({
        id: In(dto.permissionIds),
      });

      if (permissions.length !== new Set(dto.permissionIds).size) {
        throw new BadRequestException('One or more invalid permission IDs provided');
      }
    }

    await this.rolePermissionRepository.delete({ role_id: id });

    const uniquePermissionIds = Array.from(new Set(dto.permissionIds));
    const newMappings = uniquePermissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({
        role_id: id,
        permission_id: permissionId,
      }),
    );

    if (newMappings.length > 0) {
      await this.rolePermissionRepository.save(newMappings);
    }

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'ROLE_PERMISSIONS_UPDATE',
      entityType: 'ROLE',
      entityId: role.id,
      metadata: { name: role.name, permissionCount: uniquePermissionIds.length },
    });

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const role = await this.roleRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new ForbiddenException('Cannot delete system role');
    }

    await this.roleRepository.remove(role);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'ROLE_DELETE',
      entityType: 'ROLE',
      entityId: id,
      metadata: { name: role.name },
    });

    return { message: 'Role deleted successfully' };
  }
}
