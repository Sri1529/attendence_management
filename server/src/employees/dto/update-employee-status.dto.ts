import { IsEnum, IsNotEmpty } from 'class-validator';
import { EmploymentStatus } from '../entities/employee.entity.js';

export class UpdateEmployeeStatusDto {
  @IsEnum(EmploymentStatus)
  @IsNotEmpty()
  employmentStatus!: EmploymentStatus;
}
