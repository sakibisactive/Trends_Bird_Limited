import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttributeDto, CreateAttributeValueDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { generateSlug } from '../../common/utils/slugify';
import { AttributeType } from '../../common/constants/enums';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttributeDto) {
    const name = dto.name.trim();
    const slug = dto.slug ? generateSlug(dto.slug) : generateSlug(name);

    const existingName = await this.prisma.attribute.findUnique({ where: { name } });
    if (existingName) {
      throw new ConflictException(`Attribute with name '${name}' already exists`);
    }

    const existingSlug = await this.prisma.attribute.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Attribute slug '${slug}' already exists`);
    }

    const valueData = (dto.values || []).map((v) => ({
      value: v.value.trim(),
      slug: generateSlug(v.value),
      referenceValue: v.referenceValue || null,
      mediaId: v.mediaId || null,
    }));

    return this.prisma.attribute.create({
      data: {
        name,
        slug,
        type: dto.type || AttributeType.DROPDOWN,
        values: {
          create: valueData,
        },
      },
      include: {
        values: {
          include: { media: true },
        },
      },
    });
  }

  async findAll(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [attributes, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where: whereClause,
        include: {
          values: {
            include: { media: true },
            orderBy: { value: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.attribute.count({ where: whereClause }),
    ]);

    return {
      attributes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          include: { media: true },
          orderBy: { value: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID '${id}' not found`);
    }

    return attribute;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    const attribute = await this.prisma.attribute.findUnique({ where: { id } });
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID '${id}' not found`);
    }

    if (dto.name && dto.name.trim() !== attribute.name) {
      const existingName = await this.prisma.attribute.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existingName) {
        throw new ConflictException(`Attribute with name '${dto.name}' already exists`);
      }
    }

    let slug = attribute.slug;
    if (dto.slug && generateSlug(dto.slug) !== attribute.slug) {
      slug = generateSlug(dto.slug);
      const existingSlug = await this.prisma.attribute.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ConflictException(`Attribute slug '${slug}' already exists`);
      }
    }

    await this.prisma.attribute.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug,
        type: dto.type || undefined,
      },
    });

    if (dto.values) {
      // Add or update values
      for (const valDto of dto.values) {
        const valSlug = generateSlug(valDto.value);
        const existingVal = await this.prisma.attributeValue.findFirst({
          where: { attributeId: id, value: valDto.value.trim() },
        });

        if (existingVal) {
          await this.prisma.attributeValue.update({
            where: { id: existingVal.id },
            data: {
              referenceValue: valDto.referenceValue !== undefined ? valDto.referenceValue : existingVal.referenceValue,
              mediaId: valDto.mediaId !== undefined ? valDto.mediaId : existingVal.mediaId,
            },
          });
        } else {
          await this.prisma.attributeValue.create({
            data: {
              attributeId: id,
              value: valDto.value.trim(),
              slug: valSlug,
              referenceValue: valDto.referenceValue || null,
              mediaId: valDto.mediaId || null,
            },
          });
        }
      }
    }

    return this.findOne(id);
  }

  async addValue(attributeId: string, dto: CreateAttributeValueDto) {
    await this.findOne(attributeId);

    const valTrimmed = dto.value.trim();
    const existing = await this.prisma.attributeValue.findFirst({
      where: { attributeId, value: valTrimmed },
    });

    if (existing) {
      throw new ConflictException(`Attribute value '${valTrimmed}' already exists for this attribute`);
    }

    return this.prisma.attributeValue.create({
      data: {
        attributeId,
        value: valTrimmed,
        slug: generateSlug(valTrimmed),
        referenceValue: dto.referenceValue || null,
        mediaId: dto.mediaId || null,
      },
      include: { media: true },
    });
  }

  async removeValue(valueId: string) {
    const value = await this.prisma.attributeValue.findUnique({
      where: { id: valueId },
      include: {
        _count: {
          select: { variantValues: true },
        },
      },
    });

    if (!value) {
      throw new NotFoundException(`Attribute value with ID '${valueId}' not found`);
    }

    if (value._count.variantValues > 0) {
      throw new BadRequestException(
        `Cannot delete value '${value.value}' as it is currently used by ${value._count.variantValues} product variant(s)`,
      );
    }

    await this.prisma.attributeValue.delete({
      where: { id: valueId },
    });

    return { message: `Attribute value '${value.value}' deleted successfully` };
  }

  async remove(id: string) {
    const attribute = await this.findOne(id);

    // Check if any value of this attribute is used in product variants
    const usedCount = await this.prisma.variantAttributeValue.count({
      where: {
        attributeValue: { attributeId: id },
      },
    });

    if (usedCount > 0) {
      throw new BadRequestException(
        `Cannot delete attribute '${attribute.name}' as its values are used by ${usedCount} product variant(s)`,
      );
    }

    await this.prisma.attribute.delete({
      where: { id },
    });

    return { message: `Attribute '${attribute.name}' deleted successfully` };
  }
}
