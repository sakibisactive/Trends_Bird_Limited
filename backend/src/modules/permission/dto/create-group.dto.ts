import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[]; // e.g. ['create', 'read', 'update', 'delete', 'watch']

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customActions?: string[]; // e.g. ['approve', 'publish']
}
