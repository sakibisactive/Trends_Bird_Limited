import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RoleStatus } from '../../../common/constants/enums';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[]; // Array of permission IDs or names

  @IsOptional()
  grantAll?: boolean; // Shortcut to grant all available permissions
}
