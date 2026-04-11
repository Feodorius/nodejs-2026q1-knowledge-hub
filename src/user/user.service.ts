/* eslint-disable prettier/prettier */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { SortOrder } from '../comment/dto/query-comment.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUserDto): Promise<UserEntity[] | object> {
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order === SortOrder.DESC ? 'desc' : 'asc';
    }

    if (query.page !== undefined && query.limit !== undefined) {
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: query.limit,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
        }),
        this.prisma.user.count(),
      ]);
      return {
        total,
        page: query.page,
        limit: query.limit,
        data: data.map((user) => this.mapToEntity(user)),
      };
    }

    const users = await this.prisma.user.findMany({
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
    });
    return users.map((user) => this.mapToEntity(user));
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.mapToEntity(user);
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        password: dto.password,
        role: dto.role ?? UserRole.VIEWER,
      },
    });
    return this.mapToEntity(user);
  }

  async updatePassword(id: string, dto: UpdatePasswordDto): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { password: dto.newPassword },
    });
    return this.mapToEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({
        where: { authorId: id },
      }),
      this.prisma.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      }),
      this.prisma.user.delete({
        where: { id },
      }),
    ]);
  }

  private mapToEntity(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      login: user.login,
      password: user.password,
      role: user.role,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    });
  }
}
