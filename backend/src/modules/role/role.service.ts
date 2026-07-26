import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const roleName = dto.name.trim();

    const existing = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (existing) {
      throw new ConflictException(`Role with name '${roleName}' already exists`);
    }

    let targetPermissionIds: string[] = [];

    if (dto.grantAll) {
      const allPerms = await this.prisma.permission.findMany({ select: { id: true } });
      targetPermissionIds = allPerms.map((p) => p.id);
    } else if (dto.permissionIds && dto.permissionIds.length > 0) {
      // Input can be permission IDs or names (e.g. "product:create")
      const foundPerms = await this.prisma.permission.findMany({
        where: {
          OR: [
            { id: { in: dto.permissionIds } },
            { name: { in: dto.permissionIds } },
          ],
        },
        select: { id: true },
      });
      targetPermissionIds = foundPerms.map((p) => p.id);
    }

    const role = await this.prisma.role.create({
      data: {
        name: roleName,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        permissions: {
          create: targetPermissionIds.map((pId) => ({
            permissionId: pId,
          })),
        },
      },
    });

    return this.findOne(role.id);
  }

  async findAll(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { users: true },
          },
          permissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.role.count({ where: whereClause }),
    ]);

    const formattedRoles = roles.map((role) => ({
      ...role,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
    }));

    return {
      roles: formattedRoles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        permissions: {
          include: {
            permission: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    const permissions = role.permissions.map((rp) => rp.permission);

    return {
      ...role,
      userCount: role._count.users,
      permissions,
      permissionIds: permissions.map((p) => p.id),
      permissionNames: permissions.map((p) => p.name),
    };
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    if (dto.name && dto.name.trim() !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    // Safety guard: Check if removing `role:update` from the last role that holds it
    if (dto.permissionIds !== undefined && !dto.grantAll) {
      const hasRoleUpdateCurrently = role.permissions.some((rp) => rp.permission.name === 'role:update');

      if (hasRoleUpdateCurrently) {
        // Find if target permissions include role:update
        const newPerms = await this.prisma.permission.findMany({
          where: {
            OR: [
              { id: { in: dto.permissionIds } },
              { name: { in: dto.permissionIds } },
            ],
          },
        });
        const willHaveRoleUpdate = newPerms.some((p) => p.name === 'role:update');

        if (!willHaveRoleUpdate) {
          // Check how many other roles currently hold role:update
          const otherRolesWithRoleUpdate = await this.prisma.rolePermission.count({
            where: {
              permission: { name: 'role:update' },
              roleId: { not: id },
            },
          });

          if (otherRolesWithRoleUpdate === 0) {
            throw new BadRequestException(
              'Cannot strip role:update permission from this role as it is the only role in the system capable of managing roles',
            );
          }
        }
      }
    }

    let targetPermissionIds: string[] | undefined = undefined;

    if (dto.grantAll) {
      const allPerms = await this.prisma.permission.findMany({ select: { id: true } });
      targetPermissionIds = allPerms.map((p) => p.id);
    } else if (dto.permissionIds !== undefined) {
      const foundPerms = await this.prisma.permission.findMany({
        where: {
          OR: [
            { id: { in: dto.permissionIds } },
            { name: { in: dto.permissionIds } },
          ],
        },
        select: { id: true },
      });
      targetPermissionIds = foundPerms.map((p) => p.id);
    }

    // Update basic fields
    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        status: dto.status || undefined,
      },
    });

    // Update permissions if provided
    if (targetPermissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (targetPermissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: targetPermissionIds.map((pId) => ({
            roleId: id,
            permissionId: pId,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.users} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: `Role '${role.name}' deleted successfully` };
  }
}
