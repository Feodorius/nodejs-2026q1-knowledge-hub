import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class SummarizeArticleDto {
  @ApiPropertyOptional({
    enum: ['short', 'medium', 'detailed'],
    default: 'medium',
  })
  @IsEnum(['short', 'medium', 'detailed'])
  @IsOptional()
  maxLength?: 'short' | 'medium' | 'detailed';
}
