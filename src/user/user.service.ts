import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserEntity } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { SortOrder } from '../comment/dto/query-comment.dto';

@Injectable()
export class UserService {
  private users: UserEntity[] = [];

  constructor(
    private readonly articleService: ArticleService,
    private readonly commentService: CommentService,
  ) {}

  findAll(query: QueryUserDto): UserEntity[] | object {
    const result = [...this.users];

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

  findOne(id: string): UserEntity {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  create(dto: CreateUserDto): UserEntity {
    const now = Date.now();
    const user = new UserEntity({
      id: randomUUID(),
      login: dto.login,
      password: dto.password,
      role: dto.role ?? UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    });
    this.users.push(user);
    return user;
  }

  updatePassword(id: string, dto: UpdatePasswordDto): UserEntity {
    const user = this.findOne(id);
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }
    user.password = dto.newPassword;
    user.updatedAt = Date.now();
    return user;
  }

  remove(id: string): void {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(`User ${id} not found`);
    this.articleService.nullifyAuthor(id);
    this.commentService.removeByAuthor(id);
    this.users.splice(index, 1);
  }
}
