import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttributeType } from '../../../common/constants/enums';
import { Type } from 'class-transformer';

export class CreateAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  referenceValue?: string; // Hex color code or media ID

  @IsString()
  @IsOptional()
  mediaId?: string;
}

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
