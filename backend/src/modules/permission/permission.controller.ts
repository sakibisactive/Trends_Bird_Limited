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
import { PermissionService } from './permission.service';
import { CreatePermissionGroupDto } from './dto/create-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-group.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('api/v1/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post('groups')
  @RequirePermissions('permission:create')
  async createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.createGroup(dto);
  }

  @Get('groups')
  @RequirePermissions('permission:read')
  async findAllGroups(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.permissionService.findAllGroups(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('groups/:id')
  @RequirePermissions('permission:read')
  async findGroupById(@Param('id') id: string) {
    return this.permissionService.findGroupById(id);
  }

  @Put('groups/:id')
  @RequirePermissions('permission:update')
  async updateGroup(@Param('id') id: string, @Body() dto: UpdatePermissionGroupDto) {
    return this.permissionService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @RequirePermissions('permission:delete')
  async deleteGroup(@Param('id') id: string) {
    return this.permissionService.deleteGroup(id);
  }

  @Delete(':id')
  @RequirePermissions('permission:delete')
  async deletePermission(@Param('id') id: string) {
    return this.permissionService.deletePermission(id);
  }
}
