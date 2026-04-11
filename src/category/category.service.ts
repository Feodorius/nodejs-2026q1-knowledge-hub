import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { ArticleService } from '../article/article.service';
import { SortOrder } from '../comment/dto/query-comment.dto';

@Injectable()
export class CategoryService {
  private categories: CategoryEntity[] = [];

  constructor(private readonly articleService: ArticleService) {}

  findAll(query: QueryCategoryDto): CategoryEntity[] | object {
    const result = [...this.categories];

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

  findOne(id: string): CategoryEntity {
    const category = this.categories.find((c) => c.id === id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  create(dto: CreateCategoryDto): CategoryEntity {
    const category = new CategoryEntity({
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    });
    this.categories.push(category);
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): CategoryEntity {
    const category = this.findOne(id);
    Object.assign(category, dto);
    return category;
  }

  remove(id: string): void {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new NotFoundException(`Category ${id} not found`);
    this.articleService.nullifyCategory(id);
    this.categories.splice(index, 1);
  }
}
