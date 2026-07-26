import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { generateSlug } from '../../common/utils/slugify';
import { BrandStatus } from '@prisma/client';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const name = dto.name.trim();
    const slug = dto.slug ? generateSlug(dto.slug) : generateSlug(name);

    const existingName = await this.prisma.brand.findUnique({ where: { name } });
    if (existingName) {
      throw new ConflictException(`Brand with name '${name}' already exists`);
    }

    const existingSlug = await this.prisma.brand.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Brand slug '${slug}' already exists`);
    }

    if (dto.logoId) {
      const logo = await this.prisma.media.findUnique({ where: { id: dto.logoId } });
      if (!logo) {
        throw new NotFoundException(`Media asset with ID '${dto.logoId}' not found`);
      }
    }

    return this.prisma.brand.create({
      data: {
        name,
        slug,
        logoId: dto.logoId || null,
        status: dto.status || BrandStatus.ACTIVE,
        description: dto.description || null,
      },
      include: { logo: true },
    });
  }

  async findAll(search?: string, status?: BrandStatus, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const AND: any[] = [];

    if (search) {
      AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (status) {
      AND.push({ status });
    }

    const whereClause = AND.length > 0 ? { AND } : {};

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where: whereClause,
        include: {
          logo: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.brand.count({ where: whereClause }),
    ]);

    const formatted = brands.map((b) => ({
      ...b,
      productCount: b._count.products,
    }));

    return {
      brands: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        logo: true,
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    return {
      ...brand,
      productCount: brand._count.products,
    };
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    if (dto.name && dto.name.trim() !== brand.name) {
      const existingName = await this.prisma.brand.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existingName) {
        throw new ConflictException(`Brand with name '${dto.name}' already exists`);
      }
    }

    let slug = brand.slug;
    if (dto.slug && generateSlug(dto.slug) !== brand.slug) {
      slug = generateSlug(dto.slug);
      const existingSlug = await this.prisma.brand.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ConflictException(`Brand slug '${slug}' already exists`);
      }
    }

    if (dto.logoId && dto.logoId !== brand.logoId) {
      const logo = await this.prisma.media.findUnique({ where: { id: dto.logoId } });
      if (!logo) {
        throw new NotFoundException(`Media asset with ID '${dto.logoId}' not found`);
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug,
        logoId: dto.logoId !== undefined ? dto.logoId : undefined,
        status: dto.status || undefined,
        description: dto.description !== undefined ? dto.description : undefined,
      },
      include: { logo: true },
    });
  }

  async remove(id: string) {
    const brand = await this.findOne(id);

    if (brand.productCount > 0) {
      throw new BadRequestException(
        `Cannot delete brand '${brand.name}' as ${brand.productCount} product(s) are currently referencing it`,
      );
    }

    await this.prisma.brand.delete({
      where: { id },
    });

    return { message: `Brand '${brand.name}' deleted successfully` };
  }
}
