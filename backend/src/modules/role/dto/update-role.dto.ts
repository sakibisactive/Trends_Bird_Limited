import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleStatus } from '@prisma/client';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsOptional()
  grantAll?: boolean;
}
