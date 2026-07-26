import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const emailNormalized = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailNormalized },
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${emailNormalized}' already exists`);
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID '${dto.roleId}' not found`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: emailNormalized,
        password: hashedPassword,
        phone: dto.phone,
        gender: dto.gender,
        avatar: dto.avatar,
        roleId: dto.roleId,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        avatar: true,
        roleId: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll(
    search?: string,
    roleId?: string,
    isActive?: boolean,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const AND: any[] = [];

    if (search) {
      AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (roleId) {
      AND.push({ roleId });
    }

    if (isActive !== undefined) {
      AND.push({ isActive });
    }

    const whereClause = AND.length > 0 ? { AND } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gender: true,
          avatar: true,
          roleId: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        avatar: true,
        roleId: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // Self-escalation prevention
    if (id === currentUserId) {
      if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
        throw new BadRequestException(
          'Self-escalation prevented: You cannot change your own assigned role',
        );
      }
      if (dto.isActive !== undefined && dto.isActive !== user.isActive) {
        throw new BadRequestException(
          'Self-escalation prevented: You cannot deactivate your own account',
        );
      }
    }

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const emailNormalized = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findUnique({
        where: { email: emailNormalized },
      });
      if (existing) {
        throw new ConflictException(`User with email '${emailNormalized}' already exists`);
      }
    }

    if (dto.roleId && dto.roleId !== user.roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!roleExists) {
        throw new NotFoundException(`Role with ID '${dto.roleId}' not found`);
      }
    }

    let hashedPassword = undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name || undefined,
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        password: hashedPassword,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        gender: dto.gender !== undefined ? dto.gender : undefined,
        avatar: dto.avatar !== undefined ? dto.avatar : undefined,
        roleId: dto.roleId || undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        avatar: true,
        roleId: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async toggleStatus(id: string, isActive: boolean, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Self-escalation prevented: You cannot change your own active status');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        isActive: true,
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Self-deletion prevented: You cannot delete your own active account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `User '${user.email}' deleted successfully` };
  }
}
