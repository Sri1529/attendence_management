import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
