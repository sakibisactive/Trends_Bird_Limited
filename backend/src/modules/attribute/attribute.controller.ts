import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { CreateAttributeDto, CreateAttributeValueDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('api/v1/attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post()
  @RequirePermissions('attribute:create')
  async create(@Body() dto: CreateAttributeDto) {
    return this.attributeService.create(dto);
  }

  @Post(':id/values')
  @RequirePermissions('attribute:create')
  async addValue(
    @Param('id') id: string,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributeService.addValue(id, dto);
  }

  @Get()
  @RequirePermissions('attribute:read')
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attributeService.findAll(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @RequirePermissions('attribute:read')
  async findOne(@Param('id') id: string) {
    return this.attributeService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('attribute:update')
  async update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributeService.update(id, dto);
  }

  @Delete('values/:valueId')
  @RequirePermissions('attribute:delete')
  async removeValue(@Param('valueId') valueId: string) {
    return this.attributeService.removeValue(valueId);
  }

  @Delete(':id')
  @RequirePermissions('attribute:delete')
  async remove(@Param('id') id: string) {
    return this.attributeService.remove(id);
  }
}
