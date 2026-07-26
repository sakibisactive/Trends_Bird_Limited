import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

@Injectable()
export class MediaService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private readonly thumbnailDir = path.resolve(process.cwd(), 'uploads', 'thumbnails');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  async processAndUploadFiles(files: Express.Multer.File[], userId?: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const createdAssets = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`File size exceeds maximum limit of 15MB`);
      }

      const isImage = file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml';
      const isVideo = file.mimetype.startsWith('video/');
      const mediaType: MediaType = isImage
        ? MediaType.IMAGE
        : isVideo
        ? MediaType.VIDEO
        : MediaType.DOCUMENT;

      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const storedPath = path.join(this.uploadDir, uniqueFilename);

      fs.writeFileSync(storedPath, file.buffer);

      let width: number | undefined = undefined;
      let height: number | undefined = undefined;
      let thumbnailPath: string | undefined = undefined;
      let thumbnailUrl: string | undefined = undefined;

      if (isImage) {
        try {
          const imageMetadata = await sharp(file.buffer).metadata();
          width = imageMetadata.width;
          height = imageMetadata.height;

          const thumbFilename = `thumb-${uniqueFilename}`;
          thumbnailPath = path.join(this.thumbnailDir, thumbFilename);

          await sharp(file.buffer)
            .resize(200, 200, { fit: 'cover' })
            .toFile(thumbnailPath);

          thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
        } catch (err) {
          // If image processing fails, keep raw file
        }
      }

      const publicUrl = `/uploads/${uniqueFilename}`;

      const mediaRecord = await this.prisma.media.create({
        data: {
          fileName: file.originalname,
          storedPath,
          publicUrl,
          mimeType: file.mimetype,
          type: mediaType,
          size: file.size,
          width,
          height,
          thumbnail: thumbnailUrl,
          altText: path.parse(file.originalname).name,
          title: file.originalname,
          uploadedById: userId || null,
        },
      });

      createdAssets.push(mediaRecord);
    }

    return createdAssets;
  }

  async findAll(type?: MediaType, search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const AND: any[] = [];

    if (type) {
      AND.push({ type });
    }

    if (search) {
      AND.push({
        OR: [
          { fileName: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { altText: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const whereClause = AND.length > 0 ? { AND } : {};

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.media.count({ where: whereClause }),
    ]);

    return {
      media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!media) {
      throw new NotFoundException(`Media asset with ID '${id}' not found`);
    }

    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);

    return this.prisma.media.update({
      where: { id },
      data: {
        altText: dto.altText !== undefined ? dto.altText : undefined,
        title: dto.title !== undefined ? dto.title : undefined,
      },
    });
  }

  async remove(id: string) {
    const media = await this.findOne(id);

    // Delete stored files from disk
    try {
      if (fs.existsSync(media.storedPath)) {
        fs.unlinkSync(media.storedPath);
      }
      if (media.thumbnail) {
        const thumbFilename = path.basename(media.thumbnail);
        const fullThumbPath = path.join(this.thumbnailDir, thumbFilename);
        if (fs.existsSync(fullThumbPath)) {
          fs.unlinkSync(fullThumbPath);
        }
      }
    } catch (e) {
      // Ignore disk file deletion errors
    }

    // Database record deletion (relations set to onDelete: SetNull or Cascade)
    await this.prisma.media.delete({
      where: { id },
    });

    return { message: `Media asset '${media.fileName}' deleted successfully` };
  }
}
