import { Exclude } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export class UserEntity {
  id: string;
  login: string;

  @Exclude()
  password: string;

  role: UserRole;
  createdAt: number;
  updatedAt: number;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
