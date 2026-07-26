import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalProducts,
      totalUsers,
      totalBrands,
      totalCategories,
      totalMedia,
      recentProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.user.count(),
      this.prisma.brand.count(),
      this.prisma.category.count(),
      this.prisma.media.count(),
      this.prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          categories: { include: { category: true } },
          media: { include: { media: true }, take: 1 },
        },
      }),
    ]);

    return {
      metrics: {
        totalProducts,
        totalUsers,
        totalBrands,
        totalCategories,
        totalMedia,
      },
      recentProducts: recentProducts.map((p) => ({
        ...p,
        thumbnail: p.media[0]?.media || null,
      })),
    };
  }
}
