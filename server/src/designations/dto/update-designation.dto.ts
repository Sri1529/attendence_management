import { IsOptional, IsString } from 'class-validator';

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
