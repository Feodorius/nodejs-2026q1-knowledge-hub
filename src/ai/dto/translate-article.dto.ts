import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslateArticleDto {
  @ApiProperty({ example: 'Spanish' })
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsString()
  @IsOptional()
  sourceLanguage?: string;
}
