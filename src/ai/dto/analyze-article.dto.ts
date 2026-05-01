import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class AnalyzeArticleDto {
  @ApiPropertyOptional({
    enum: ['review', 'bugs', 'optimize', 'explain'],
    default: 'review',
  })
  @IsEnum(['review', 'bugs', 'optimize', 'explain'])
  @IsOptional()
  task?: 'review' | 'bugs' | 'optimize' | 'explain';
}
