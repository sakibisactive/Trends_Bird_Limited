import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customActions?: string[];
}
