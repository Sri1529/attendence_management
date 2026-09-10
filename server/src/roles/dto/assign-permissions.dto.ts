import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  permissionIds!: string[];
}
