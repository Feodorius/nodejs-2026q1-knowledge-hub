import { Exclude, Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserEntity {
  id: string;
  login: string;

  @Exclude()
  password: string;

  @Transform(({ value }) => value?.toLowerCase())
  role: UserRole;

  createdAt: number;
  updatedAt: number;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
