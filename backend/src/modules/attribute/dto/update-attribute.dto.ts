import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttributeType } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateAttributeValueDto } from './create-attribute.dto';

export class UpdateAttributeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  type?: AttributeType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeValueDto)
  @IsOptional()
  values?: CreateAttributeValueDto[];
}
