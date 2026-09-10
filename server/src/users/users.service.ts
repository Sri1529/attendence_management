import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity.js';
import { Role, RoleStatus } from '../roles/entities/role.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { hashPassword } from '../common/utils/password.util.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(companyId: string, dto: CreateUserDto, actorId?: string) {
    const existingEmail = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, company_id: companyId },
    });

    if (!role || role.status !== RoleStatus.ACTIVE) {
      throw new BadRequestException('Invalid or inactive role for this company');
    }

    const password_hash = await hashPassword(dto.password);

    const user = this.userRepository.create({
      company_id: companyId,
      role_id: dto.roleId,
      name: dto.name,
      email: dto.email,
      password_hash,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: savedUser.id,
      metadata: { name: savedUser.name, email: savedUser.email },
    });

    return this.findOne(companyId, savedUser.id);
  }

  async findAll(companyId: string) {
    const users = await this.userRepository.find({
      where: { company_id: companyId },
      relations: { role: true },
      order: { created_at: 'DESC' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(companyId: string, id: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(companyId: string, id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('Email is already taken');
      }
      user.email = dto.email;
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.password) {
      user.password_hash = await hashPassword(dto.password);
    }

    if (dto.roleId && dto.roleId !== user.role_id) {
      const newRole = await this.roleRepository.findOne({
        where: { id: dto.roleId, company_id: companyId },
      });

      if (!newRole || newRole.status !== RoleStatus.ACTIVE) {
        throw new BadRequestException('Invalid or inactive role for this company');
      }

      if (user.role && user.role.name.toLowerCase().includes('owner')) {
        await this.ensureNotLastOwner(companyId, user.id);
      }

      user.role_id = dto.roleId;
    }

    const saved = await this.userRepository.save(user);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'USER_UPDATE',
      entityType: 'USER',
      entityId: saved.id,
      metadata: { name: saved.name, email: saved.email },
    });

    return this.findOne(companyId, id);
  }

  async updateStatus(companyId: string, id: string, dto: UpdateUserStatusDto, actorId?: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.status === UserStatus.INACTIVE && user.role && user.role.name.toLowerCase().includes('owner')) {
      await this.ensureNotLastOwner(companyId, user.id);
    }

    user.status = dto.status;
    const saved = await this.userRepository.save(user);

    await this.auditLogsService.logAction({
      companyId,
      userId: actorId || null,
      action: 'USER_STATUS_UPDATE',
      entityType: 'USER',
      entityId: saved.id,
      metadata: { name: saved.name, status: saved.status },
    });

    return this.findOne(companyId, id);
  }

  private async ensureNotLastOwner(companyId: string, userId: string) {
    const activeUsersInCompany = await this.userRepository.find({
      where: { company_id: companyId, status: UserStatus.ACTIVE },
      relations: { role: true },
    });

    const activeOwners = activeUsersInCompany.filter(
      (u) => u.role && u.role.name.toLowerCase().includes('owner'),
    );

    if (activeOwners.length <= 1 && activeOwners.some((u) => u.id === userId)) {
      throw new ForbiddenException(
        'Cannot deactivate or modify the last active Company Owner',
      );
    }
  }

  public sanitizeUser(user: User) {
    const { password_hash: _ph, refresh_token_hash: _rth, ...sanitized } = user as any;
    return sanitized;
  }
}
