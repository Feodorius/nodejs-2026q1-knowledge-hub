import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { SortOrder } from '../comment/dto/query-comment.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCategoryDto): Promise<CategoryEntity[] | object> {
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order === SortOrder.DESC ? 'desc' : 'asc';
    }

    if (query.page !== undefined && query.limit !== undefined) {
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        this.prisma.category.findMany({
          skip,
          take: query.limit,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
        }),
        this.prisma.category.count(),
      ]);
      return {
        total,
        page: query.page,
        limit: query.limit,
        data: data.map((cat) => this.toCategoryEntity(cat)),
      };
    }

    const categories = await this.prisma.category.findMany({
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
    });
    return categories.map((cat) => this.toCategoryEntity(cat));
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return this.toCategoryEntity(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    try {
      const category = await this.prisma.category.create({
        data: { name: dto.name, description: dto.description },
      });
      return this.toCategoryEntity(category);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          `Category with name "${dto.name}" already exists`,
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
    return this.toCategoryEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);

    await this.prisma.category.delete({
      where: { id },
    });
  }

  private toCategoryEntity(category: Category): CategoryEntity {
    return new CategoryEntity({
      id: category.id,
      name: category.name,
      description: category.description,
    });
  }
}
