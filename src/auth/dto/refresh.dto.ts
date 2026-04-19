import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
