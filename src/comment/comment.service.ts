import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CommentEntity } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto, SortOrder } from './dto/query-comment.dto';
import { ArticleService } from '../article/article.service';

@Injectable()
export class CommentService {
  private comments: CommentEntity[] = [];

  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}

  findByArticle(query: QueryCommentDto): CommentEntity[] | object {
    let result = this.comments.filter((c) => c.articleId === query.articleId);

    if (query.sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = a[query.sortBy];
        const bVal = b[query.sortBy];
        const dir = query.order === SortOrder.DESC ? -1 : 1;
        return aVal > bVal ? dir : aVal < bVal ? -dir : 0;
      });
    }

    if (query.page !== undefined && query.limit !== undefined) {
      const total = result.length;
      const start = (query.page - 1) * query.limit;
      const data = result.slice(start, start + query.limit);
      return { total, page: query.page, limit: query.limit, data };
    }

    return result;
  }

  findOne(id: string): CommentEntity {
    const comment = this.comments.find((c) => c.id === id);
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return comment;
  }

  async create(dto: CreateCommentDto): Promise<CommentEntity> {
    try {
      this.articleService.findOne(dto.articleId);
    } catch {
      throw new UnprocessableEntityException(
        `Article ${dto.articleId} not found`,
      );
    }

    const comment = new CommentEntity({
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: Date.now(),
    });
    this.comments.push(comment);
    return comment;
  }

  remove(id: string): void {
    const index = this.comments.findIndex((c) => c.id === id);
    if (index === -1) throw new NotFoundException(`Comment ${id} not found`);
    this.comments.splice(index, 1);
  }

  removeByArticle(articleId: string): void {
    this.comments = this.comments.filter((c) => c.articleId !== articleId);
  }

  removeByAuthor(authorId: string): void {
    this.comments = this.comments.filter((c) => c.authorId !== authorId);
  }
}
