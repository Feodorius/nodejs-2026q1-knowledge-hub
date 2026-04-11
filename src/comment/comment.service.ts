import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Comment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommentEntity } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto, SortOrder } from './dto/query-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findByArticle(
    query: QueryCommentDto,
  ): Promise<CommentEntity[] | object> {
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order === SortOrder.DESC ? 'desc' : 'asc';
    }

    const article = await this.prisma.article.findUnique({
      where: { id: query.articleId },
    });
    if (!article) {
      throw new NotFoundException(`Article ${query.articleId} not found`);
    }

    if (query.page !== undefined && query.limit !== undefined) {
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        this.prisma.comment.findMany({
          where: { articleId: query.articleId },
          skip,
          take: query.limit,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
        }),
        this.prisma.comment.count({
          where: { articleId: query.articleId },
        }),
      ]);
      return {
        total,
        page: query.page,
        limit: query.limit,
        data: data.map((comment) => this.mapToEntity(comment)),
      };
    }

    const comments = await this.prisma.comment.findMany({
      where: { articleId: query.articleId },
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
    });
    return comments.map((comment) => this.mapToEntity(comment));
  }

  async findOne(id: string): Promise<CommentEntity> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return this.mapToEntity(comment);
  }

  async create(dto: CreateCommentDto): Promise<CommentEntity> {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new UnprocessableEntityException(
        `Article ${dto.articleId} not found`,
      );
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId: dto.authorId ?? null,
      },
    });
    return this.mapToEntity(comment);
  }

  async remove(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);

    await this.prisma.comment.delete({
      where: { id },
    });
  }

  private mapToEntity(comment: Comment): CommentEntity {
    return new CommentEntity({
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt: comment.createdAt.getTime(),
    });
  }
}
