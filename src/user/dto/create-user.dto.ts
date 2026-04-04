import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.VIEWER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
