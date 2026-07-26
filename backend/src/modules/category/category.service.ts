import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../../common/utils/slugify';
import { checkCategoryCycle } from '../../common/utils/cycle-checker';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? generateSlug(dto.slug) : generateSlug(dto.name);

    const existingSlug = await this.prisma.category.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Category slug '${slug}' already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
    }

    if (dto.imageId) {
      const image = await this.prisma.media.findUnique({ where: { id: dto.imageId } });
      if (!image) {
        throw new NotFoundException(`Media asset with ID '${dto.imageId}' not found`);
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageId: dto.imageId || null,
        parentId: dto.parentId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sortOrder: dto.sortOrder || 0,
      },
      include: {
        image: true,
        parent: true,
      },
    });
  }

  async getTree() {
    const allCategories = await this.prisma.category.findMany({
      include: {
        image: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const categoryMap = new Map<string, any>();
    const tree: any[] = [];

    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat,
        productCount: cat._count.products,
        children: [],
      });
    });

    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id);
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }

  async findAll(search?: string, isActive?: boolean, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const AND: any[] = [];

    if (search) {
      AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (isActive !== undefined) {
      AND.push({ isActive });
    }

    const whereClause = AND.length > 0 ? { AND } : {};

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: whereClause,
        include: {
          image: true,
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where: whereClause }),
    ]);

    const formatted = categories.map((c) => ({
      ...c,
      productCount: c._count.products,
    }));

    return {
      categories: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        image: true,
        parent: true,
        children: {
          include: { image: true },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return {
      ...category,
      productCount: category._count.products,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (dto.parentId !== undefined) {
      await checkCategoryCycle(this.prisma, id, dto.parentId);
    }

    let slug = category.slug;
    if (dto.slug && generateSlug(dto.slug) !== category.slug) {
      slug = generateSlug(dto.slug);
      const existingSlug = await this.prisma.category.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ConflictException(`Category slug '${slug}' already exists`);
      }
    } else if (dto.name && !dto.slug && generateSlug(dto.name) !== category.slug) {
      slug = generateSlug(dto.name);
      const existingSlug = await this.prisma.category.findUnique({ where: { slug } });
      if (!existingSlug && existingSlug !== null) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name || undefined,
        slug,
        description: dto.description !== undefined ? dto.description : undefined,
        imageId: dto.imageId !== undefined ? dto.imageId : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
      },
      include: {
        image: true,
        parent: true,
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    // Reassign child categories to parent of deleted category
    await this.prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: category.parentId },
    });

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: `Category '${category.name}' deleted successfully. Subcategories were cleanly reassigned.` };
  }
}
