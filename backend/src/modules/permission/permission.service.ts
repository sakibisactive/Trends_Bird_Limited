import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionGroupDto } from './dto/create-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-group.dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async createGroup(dto: CreatePermissionGroupDto) {
    const normalizedGroupName = dto.name.trim().toLowerCase();
    
    const existingGroup = await this.prisma.permissionGroup.findUnique({
      where: { name: normalizedGroupName },
    });
    if (existingGroup) {
      throw new ConflictException(`Permission group '${normalizedGroupName}' already exists`);
    }

    const allActions = Array.from(
      new Set([...(dto.actions || []), ...(dto.customActions || [])]),
    );

    const group = await this.prisma.permissionGroup.create({
      data: {
        name: normalizedGroupName,
        description: dto.description,
      },
    });

    const permissionData = allActions.map((action) => {
      const normalizedAction = action.trim().toLowerCase().replace(/\s+/g, '_');
      const permName = `${normalizedGroupName}:${normalizedAction}`;
      return {
        name: permName,
        description: `${normalizedAction} capability for ${normalizedGroupName}`,
        groupId: group.id,
      };
    });

    if (permissionData.length > 0) {
      await this.prisma.permission.createMany({
        data: permissionData,
        skipDuplicates: true,
      });
    }

    return this.findGroupById(group.id);
  }

  async findAllGroups(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [groups, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where: whereClause,
        include: {
          permissions: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionGroup.count({ where: whereClause }),
    ]);

    return {
      groups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findGroupById(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Permission group with ID '${id}' not found`);
    }

    return group;
  }

  async updateGroup(id: string, dto: UpdatePermissionGroupDto) {
    const group = await this.findGroupById(id);

    let groupName = group.name;
    if (dto.name && dto.name.toLowerCase().trim() !== group.name) {
      groupName = dto.name.toLowerCase().trim();
      const existing = await this.prisma.permissionGroup.findUnique({
        where: { name: groupName },
      });
      if (existing) {
        throw new ConflictException(`Permission group '${groupName}' already exists`);
      }
    }

    await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: groupName,
        description: dto.description !== undefined ? dto.description : group.description,
      },
    });

    if (dto.actions || dto.customActions) {
      const newActions = Array.from(
        new Set([...(dto.actions || []), ...(dto.customActions || [])]),
      );

      // Re-build permissions for group
      const existingPerms = await this.prisma.permission.findMany({
        where: { groupId: id },
      });

      const newPermNames = newActions.map(
        (action) => `${groupName}:${action.trim().toLowerCase().replace(/\s+/g, '_')}`,
      );

      // Delete permissions no longer included
      const permsToDelete = existingPerms.filter((p) => !newPermNames.includes(p.name));
      if (permsToDelete.length > 0) {
        await this.prisma.permission.deleteMany({
          where: { id: { in: permsToDelete.map((p) => p.id) } },
        });
      }

      // Add missing new permissions
      const existingPermNames = existingPerms.map((p) => p.name);
      const permsToAdd = newPermNames.filter((name) => !existingPermNames.includes(name));

      if (permsToAdd.length > 0) {
        const toCreate = permsToAdd.map((name) => ({
          name,
          description: `${name.split(':')[1]} capability for ${groupName}`,
          groupId: id,
        }));
        await this.prisma.permission.createMany({
          data: toCreate,
        });
      }
    }

    return this.findGroupById(id);
  }

  async deletePermission(permissionId: string) {
    const perm = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!perm) {
      throw new NotFoundException(`Permission with ID '${permissionId}' not found`);
    }

    // Role links are set to onDelete: Cascade in Prisma schema.
    await this.prisma.permission.delete({
      where: { id: permissionId },
    });

    return { message: `Permission '${perm.name}' deleted successfully. Associated role links were cascaded.` };
  }

  async deleteGroup(groupId: string) {
    const group = await this.findGroupById(groupId);

    await this.prisma.permissionGroup.delete({
      where: { id: groupId },
    });

    return { message: `Permission group '${group.name}' and all its permissions deleted successfully.` };
  }
}
