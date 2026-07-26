import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateSlug } from '../../common/utils/slugify';
import { StockStatus } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    this.validateProductLogic(dto);

    const name = dto.name.trim();
    const slug = dto.slug ? generateSlug(dto.slug) : generateSlug(name);
    const sku = dto.sku.trim();

    // Check unique slug and main SKU
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Product slug '${slug}' already exists`);
    }

    const existingSku = await this.prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      throw new ConflictException(`Product SKU '${sku}' already exists`);
    }

    // Check variant SKUs
    if (dto.hasVariants && dto.variants && dto.variants.length > 0) {
      const variantSkus = dto.variants.map((v) => v.sku.trim());
      const skuSet = new Set(variantSkus);
      if (skuSet.size !== variantSkus.length) {
        throw new BadRequestException('Duplicate SKUs found among provided variants');
      }

      for (const vSku of variantSkus) {
        if (vSku === sku) {
          throw new BadRequestException(`Variant SKU '${vSku}' cannot be identical to top-level product SKU`);
        }
        const existingVariantSku = await this.prisma.productVariant.findUnique({
          where: { sku: vSku },
        });
        if (existingVariantSku) {
          throw new ConflictException(`Variant SKU '${vSku}' already exists in database`);
        }
      }

      // Check duplicate attribute combinations among variants
      this.validateVariantCombinations(dto.variants);
    }

    // Validate category and brand existences
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) {
        throw new NotFoundException(`Brand with ID '${dto.brandId}' not found`);
      }
    }

    if (dto.categoryIds && dto.categoryIds.length > 0) {
      const foundCount = await this.prisma.category.count({
        where: { id: { in: dto.categoryIds } },
      });
      if (foundCount !== dto.categoryIds.length) {
        throw new NotFoundException('One or more specified categories do not exist');
      }
    }

    // Perform atomic transaction
    const createdProduct = await this.prisma.$transaction(async (tx) => {
      // Calculate top-level stock status for simple products
      let topStockStatus: StockStatus = StockStatus.IN_STOCK;
      if (!dto.hasVariants && dto.stock !== undefined) {
        topStockStatus = dto.stock > 0 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK;
      }

      const product = await tx.product.create({
        data: {
          name,
          slug,
          sku,
          shortDescription: dto.shortDescription || null,
          longDescription: dto.longDescription || null,
          hasVariants: dto.hasVariants || false,
          price: !dto.hasVariants ? dto.price : null,
          salePrice: !dto.hasVariants ? (dto.salePrice !== undefined ? dto.salePrice : null) : null,
          stock: !dto.hasVariants ? dto.stock : null,
          stockStatus: topStockStatus,
          weight: dto.weight || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          isFeatured: dto.isFeatured || false,
          sortOrder: dto.sortOrder || 0,
          brandId: dto.brandId || null,
          categories: {
            create: (dto.categoryIds || []).map((catId) => ({
              categoryId: catId,
            })),
          },
        },
      });

      // Handle media attachments for top-level product
      if (dto.media && dto.media.length > 0) {
        this.validateMediaThumbnails(dto.media);
        await tx.productMedia.createMany({
          data: dto.media.map((m) => ({
            productId: product.id,
            mediaId: m.mediaId,
            variantId: m.variantId || null,
            attributeValueId: m.attributeValueId || null,
            isThumbnail: m.isThumbnail || false,
            isGallery: m.isGallery !== undefined ? m.isGallery : true,
            sortOrder: m.sortOrder || 0,
          })),
        });
      }

      // Handle variants
      if (dto.hasVariants && dto.variants && dto.variants.length > 0) {
        for (const varDto of dto.variants) {
          // Validate attribute values exist
          const foundAttrValCount = await tx.attributeValue.count({
            where: { id: { in: varDto.attributeValueIds } },
          });
          if (foundAttrValCount !== varDto.attributeValueIds.length) {
            throw new NotFoundException(`One or more attribute values specified for variant '${varDto.sku}' do not exist`);
          }

          const varStockStatus = varDto.stock > 0 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK;

          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: varDto.sku.trim(),
              price: varDto.price,
              salePrice: varDto.salePrice !== undefined ? varDto.salePrice : null,
              stock: varDto.stock,
              stockStatus: varStockStatus,
              lowStockThreshold: varDto.lowStockThreshold || 5,
              weight: varDto.weight || null,
              isActive: varDto.isActive !== undefined ? varDto.isActive : true,
              attributeValues: {
                create: varDto.attributeValueIds.map((attrValId) => ({
                  attributeValueId: attrValId,
                })),
              },
            },
          });

          // Handle variant-specific media
          if (varDto.media && varDto.media.length > 0) {
            await tx.productMedia.createMany({
              data: varDto.media.map((m) => ({
                productId: product.id,
                variantId: variant.id,
                mediaId: m.mediaId,
                attributeValueId: m.attributeValueId || null,
                isThumbnail: m.isThumbnail || false,
                isGallery: m.isGallery !== undefined ? m.isGallery : true,
                sortOrder: m.sortOrder || 0,
              })),
            });
          }
        }
      }

      return product;
    });

    return this.findOne(createdProduct.id);
  }

  async findAll(
    search?: string,
    categoryId?: string,
    brandId?: string,
    isActive?: boolean,
    hasVariants?: boolean,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const AND: any[] = [];

    if (search) {
      AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (categoryId) {
      AND.push({
        categories: {
          some: { categoryId },
        },
      });
    }

    if (brandId) {
      AND.push({ brandId });
    }

    if (isActive !== undefined) {
      AND.push({ isActive });
    }

    if (hasVariants !== undefined) {
      AND.push({ hasVariants });
    }

    const whereClause = AND.length > 0 ? { AND } : {};

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: whereClause,
        include: {
          brand: true,
          categories: {
            include: { category: true },
          },
          media: {
            include: { media: true },
          },
          variants: {
            include: {
              attributeValues: {
                include: {
                  attributeValue: {
                    include: { attribute: true },
                  },
                },
              },
              media: { include: { media: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    const formatted = products.map((p) => {
      const primaryThumbnail = p.media.find((m) => m.isThumbnail)?.media || p.media[0]?.media || null;
      let priceDisplay = '';
      if (!p.hasVariants) {
        priceDisplay = p.salePrice ? `$${p.salePrice} (Was $${p.price})` : `$${p.price}`;
      } else if (p.variants.length > 0) {
        const prices = p.variants.map((v) => v.salePrice || v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        priceDisplay = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;
      }

      return {
        ...p,
        thumbnail: primaryThumbnail,
        priceDisplay,
        categoryList: p.categories.map((c) => c.category),
      };
    });

    return {
      products: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: { include: { logo: true } },
        categories: {
          include: { category: { include: { image: true } } },
        },
        media: {
          include: { media: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          include: {
            attributeValues: {
              include: {
                attributeValue: {
                  include: { attribute: true, media: true },
                },
              },
            },
            media: {
              include: { media: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const primaryThumbnail = product.media.find((m) => m.isThumbnail)?.media || product.media[0]?.media || null;

    return {
      ...product,
      primaryThumbnail,
      categories: product.categories.map((c) => c.category),
      categoryIds: product.categories.map((c) => c.categoryId),
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Validate update rules
    const mergedHasVariants = dto.hasVariants !== undefined ? dto.hasVariants : existing.hasVariants;
    if (mergedHasVariants) {
      if (dto.price !== undefined || dto.stock !== undefined) {
        throw new BadRequestException('Price and stock cannot be set on a variable product');
      }
    }

    let slug = existing.slug;
    if (dto.slug && generateSlug(dto.slug) !== existing.slug) {
      slug = generateSlug(dto.slug);
      const duplicateSlug = await this.prisma.product.findUnique({ where: { slug } });
      if (duplicateSlug) {
        throw new ConflictException(`Product slug '${slug}' already exists`);
      }
    }

    let sku = existing.sku;
    if (dto.sku && dto.sku.trim() !== existing.sku) {
      sku = dto.sku.trim();
      const duplicateSku = await this.prisma.product.findUnique({ where: { sku } });
      if (duplicateSku) {
        throw new ConflictException(`Product SKU '${sku}' already exists`);
      }
    }

    // Atomic update
    await this.prisma.$transaction(async (tx) => {
      // Basic update
      await tx.product.update({
        where: { id },
        data: {
          name: dto.name || undefined,
          slug,
          sku,
          shortDescription: dto.shortDescription !== undefined ? dto.shortDescription : undefined,
          longDescription: dto.longDescription !== undefined ? dto.longDescription : undefined,
          hasVariants: mergedHasVariants,
          price: !mergedHasVariants ? (dto.price !== undefined ? dto.price : existing.price) : null,
          salePrice: !mergedHasVariants ? (dto.salePrice !== undefined ? dto.salePrice : existing.salePrice) : null,
          stock: !mergedHasVariants ? (dto.stock !== undefined ? dto.stock : existing.stock) : null,
          weight: dto.weight !== undefined ? dto.weight : undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
          isFeatured: dto.isFeatured !== undefined ? dto.isFeatured : undefined,
          sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
          brandId: dto.brandId !== undefined ? dto.brandId : undefined,
        },
      });

      // Categories update
      if (dto.categoryIds !== undefined) {
        await tx.categoryProduct.deleteMany({ where: { productId: id } });
        if (dto.categoryIds.length > 0) {
          await tx.categoryProduct.createMany({
            data: dto.categoryIds.map((catId) => ({
              productId: id,
              categoryId: catId,
            })),
          });
        }
      }

      // Media update
      if (dto.media !== undefined) {
        this.validateMediaThumbnails(dto.media);
        await tx.productMedia.deleteMany({ where: { productId: id, variantId: null } });
        if (dto.media.length > 0) {
          await tx.productMedia.createMany({
            data: dto.media.map((m) => ({
              productId: id,
              mediaId: m.mediaId,
              attributeValueId: m.attributeValueId || null,
              isThumbnail: m.isThumbnail || false,
              isGallery: m.isGallery !== undefined ? m.isGallery : true,
              sortOrder: m.sortOrder || 0,
            })),
          });
        }
      }

      // Variants update
      if (mergedHasVariants && dto.variants !== undefined) {
        this.validateVariantCombinations(dto.variants);

        // Delete existing variants and re-create
        await tx.productVariant.deleteMany({ where: { productId: id } });

        for (const varDto of dto.variants) {
          const varStockStatus = varDto.stock > 0 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK;

          const variant = await tx.productVariant.create({
            data: {
              productId: id,
              sku: varDto.sku.trim(),
              price: varDto.price,
              salePrice: varDto.salePrice !== undefined ? varDto.salePrice : null,
              stock: varDto.stock,
              stockStatus: varStockStatus,
              lowStockThreshold: varDto.lowStockThreshold || 5,
              weight: varDto.weight || null,
              isActive: varDto.isActive !== undefined ? varDto.isActive : true,
              attributeValues: {
                create: varDto.attributeValueIds.map((attrValId) => ({
                  attributeValueId: attrValId,
                })),
              },
            },
          });

          if (varDto.media && varDto.media.length > 0) {
            await tx.productMedia.createMany({
              data: varDto.media.map((m) => ({
                productId: id,
                variantId: variant.id,
                mediaId: m.mediaId,
                attributeValueId: m.attributeValueId || null,
                isThumbnail: m.isThumbnail || false,
                isGallery: m.isGallery !== undefined ? m.isGallery : true,
                sortOrder: m.sortOrder || 0,
              })),
            });
          }
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    // Variants and ProductMedia attachment records cascade-deleted per Prisma schema.
    // Stored media assets survive cleanly.
    await this.prisma.product.delete({
      where: { id },
    });

    return { message: `Product '${product.name}' deleted successfully. Shared media assets preserved.` };
  }

  private validateProductLogic(dto: CreateProductDto) {
    if (dto.hasVariants) {
      if (dto.price !== undefined || dto.stock !== undefined) {
        throw new BadRequestException('A variable product cannot have top-level price or stock');
      }
      if (!dto.variants || dto.variants.length === 0) {
        throw new BadRequestException('A variable product must specify at least one variant');
      }
    } else {
      if (dto.price === undefined) {
        throw new BadRequestException('A simple product requires a price');
      }
      if (dto.stock === undefined) {
        throw new BadRequestException('A simple product requires a stock count');
      }
      if (dto.salePrice !== undefined && dto.salePrice > dto.price) {
        throw new BadRequestException('Sale price cannot exceed the original price');
      }
      if (dto.variants && dto.variants.length > 0) {
        throw new BadRequestException('A simple product cannot have variants');
      }
    }
  }

  private validateVariantCombinations(variants: any[]) {
    const seenCombos = new Set<string>();

    for (const v of variants) {
      if (v.salePrice !== undefined && v.salePrice > v.price) {
        throw new BadRequestException(`Variant '${v.sku}' sale price cannot exceed original price`);
      }

      const comboKey = [...v.attributeValueIds].sort().join('|');
      if (seenCombos.has(comboKey)) {
        throw new BadRequestException(
          `Two variants of a product cannot have the exact same attribute combination (${comboKey})`,
        );
      }
      seenCombos.add(comboKey);
    }
  }

  private validateMediaThumbnails(media: any[]) {
    const thumbnailCount = media.filter((m) => m.isThumbnail).length;
    if (thumbnailCount > 1) {
      throw new BadRequestException('A product can have at most ONE primary thumbnail image');
    }
  }
}
