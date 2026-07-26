import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BrandStatus } from '@prisma/client';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  logoId?: string;

  @IsEnum(BrandStatus)
  @IsOptional()
  status?: BrandStatus;

  @IsString()
  @IsOptional()
  description?: string;
}
