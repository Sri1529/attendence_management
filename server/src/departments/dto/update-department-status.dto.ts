import { IsEnum, IsNotEmpty } from 'class-validator';
import { DepartmentStatus } from '../entities/department.entity.js';

export class UpdateDepartmentStatusDto {
  @IsEnum(DepartmentStatus)
  @IsNotEmpty()
  status!: DepartmentStatus;
}
