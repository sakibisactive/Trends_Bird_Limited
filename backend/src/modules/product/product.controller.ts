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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('api/v1/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('product:create')
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @RequirePermissions('product:read')
  async findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('isActive') isActive?: string,
    @Query('hasVariants') hasVariants?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const variantsBool = hasVariants !== undefined ? hasVariants === 'true' : undefined;
    return this.productService.findAll(
      search,
      categoryId,
      brandId,
      activeBool,
      variantsBool,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @RequirePermissions('product:read')
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('product:update')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
