import { Injectable } from '@nestjs/common';
import { User, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtRequester } from '../auth/jwt-requester.interface';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { SortOrder } from '../comment/dto/query-comment.dto';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../common/errors';

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
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return this.mapToEntity(user);
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.create({
        data: {
          login: dto.login,
          password: dto.password,
          role: dto.role ?? UserRole.VIEWER,
        },
      });
      return this.mapToEntity(user);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ValidationError(`Login "${dto.login}" is already taken`);
      }
      throw e;
    }
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
    requester?: JwtRequester,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundError(`User ${id} not found`);

    if (requester) {
      const isAdmin = requester.role?.toUpperCase() === UserRole.ADMIN;
      const isSelf = requester.userId === id;
      if (!isAdmin && !isSelf) {
        throw new ForbiddenError('You can only update your own password');
      }
    }
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenError('Old password is incorrect');
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
    if (!user) throw new NotFoundError(`User ${id} not found`);

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
