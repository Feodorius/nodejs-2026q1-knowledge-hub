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

@Injectable()
export class UserService {
  private users: UserEntity[] = [];

  findAll(): UserEntity[] {
    return this.users;
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
    this.users.splice(index, 1);
  }
}
