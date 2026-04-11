import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ArticleEntity } from './entities/article.entity';
import { ArticleStatus } from './enums/article-status.enum';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { CommentService } from '../comment/comment.service';
import { SortOrder } from '../comment/dto/query-comment.dto';

@Injectable()
export class ArticleService {
  private articles: ArticleEntity[] = [];

  constructor(
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}

  findAll(query: QueryArticleDto): ArticleEntity[] | object {
    let result = [...this.articles];

    if (query.status) {
      result = result.filter((a) => a.status === query.status);
    }
    if (query.categoryId) {
      result = result.filter((a) => a.categoryId === query.categoryId);
    }
    if (query.tag) {
      result = result.filter((a) => a.tags.includes(query.tag));
    }

    if (query.sortBy) {
      result.sort((a, b) => {
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

  findOne(id: string): ArticleEntity {
    const article = this.articles.find((a) => a.id === id);
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }

  create(dto: CreateArticleDto): ArticleEntity {
    const now = Date.now();
    const article = new ArticleEntity({
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status ?? ArticleStatus.DRAFT,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    });
    this.articles.push(article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): ArticleEntity {
    const article = this.findOne(id);
    Object.assign(article, {
      ...dto,
      updatedAt: Date.now(),
    });
    return article;
  }

  remove(id: string): void {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) throw new NotFoundException(`Article ${id} not found`);
    this.commentService.removeByArticle(id);
    this.articles.splice(index, 1);
  }

  nullifyAuthor(userId: string): void {
    this.articles
      .filter((a) => a.authorId === userId)
      .forEach((a) => {
        a.authorId = null;
        a.updatedAt = Date.now();
      });
  }

  nullifyCategory(categoryId: string): void {
    this.articles
      .filter((a) => a.categoryId === categoryId)
      .forEach((a) => {
        a.categoryId = null;
        a.updatedAt = Date.now();
      });
  }
}
