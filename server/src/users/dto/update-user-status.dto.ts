import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../entities/user.entity.js';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status!: UserStatus;
}
