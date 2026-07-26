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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { BrandStatus } from '../../common/constants/enums';

@Controller('api/v1/brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @RequirePermissions('brand:create')
  async create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @Get()
  @RequirePermissions('brand:read')
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: BrandStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.brandService.findAll(
      search,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @RequirePermissions('brand:read')
  async findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('brand:update')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('brand:delete')
  async remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
