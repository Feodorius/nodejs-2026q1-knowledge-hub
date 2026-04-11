import { Injectable, NotFoundException } from '@nestjs/common';
import { Article, ArticleStatus, Tag, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleEntity } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { SortOrder } from '../comment/dto/query-comment.dto';

type ArticleWithTags = Article & { tags: Tag[] };

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryArticleDto): Promise<ArticleEntity[] | object> {
    const where: Prisma.ArticleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.tag) where.tags = { some: { name: query.tag } };

    const orderBy: Prisma.ArticleOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order === SortOrder.DESC ? 'desc' : 'asc';
    }

    if (query.page !== undefined && query.limit !== undefined) {
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
          include: { tags: true },
        }),
        this.prisma.article.count({ where }),
      ]);
      return {
        total,
        page: query.page,
        limit: query.limit,
        data: data.map((article) => this.mapToEntity(article)),
      };
    }

    const articles = await this.prisma.article.findMany({
      where,
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
      include: { tags: true },
    });
    return articles.map((article) => this.mapToEntity(article));
  }

  async findOne(id: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return this.mapToEntity(article);
  }

  async create(dto: CreateArticleDto): Promise<ArticleEntity> {
    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status ?? ArticleStatus.DRAFT,
        authorId: dto.authorId ?? null,
        categoryId: dto.categoryId ?? null,
        tags: dto.tags?.length
          ? {
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { tags: true },
    });
    return this.mapToEntity(article);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<ArticleEntity> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Article ${id} not found`);

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
        tags: dto.tags
          ? {
              set: [],
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { tags: true },
    });
    return this.mapToEntity(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    await this.prisma.article.delete({ where: { id } });
  }

  private mapToEntity(article: ArticleWithTags): ArticleEntity {
    return new ArticleEntity({
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status,
      authorId: article.authorId,
      categoryId: article.categoryId,
      tags: article.tags.map((tag) => tag.name),
      createdAt: article.createdAt.getTime(),
      updatedAt: article.updatedAt.getTime(),
    });
  }
}
