import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

export async function checkCategoryCycle(
  prisma: PrismaService,
  categoryId: string,
  targetParentId: string | null,
): Promise<void> {
  if (!targetParentId) return;

  if (categoryId === targetParentId) {
    throw new BadRequestException('A category cannot be its own parent');
  }

  let currentParentId: string | null = targetParentId;
  const visited = new Set<string>([categoryId]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new BadRequestException('Category hierarchy cycle detected: A category cannot be its own ancestor');
    }
    visited.add(currentParentId);

    const parentCategory: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });

    currentParentId = parentCategory?.parentId || null;
  }
}
