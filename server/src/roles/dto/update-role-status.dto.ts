import { IsEnum, IsNotEmpty } from 'class-validator';
import { RoleStatus } from '../entities/role.entity.js';

export class UpdateRoleStatusDto {
  @IsEnum(RoleStatus)
  @IsNotEmpty()
  status!: RoleStatus;
}
