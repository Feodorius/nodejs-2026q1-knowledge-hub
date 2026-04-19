import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ArticleStatus } from '@prisma/client';

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: ArticleStatus })
  @Transform(({ value }) => value?.toUpperCase())
  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((o) => o.authorId !== null)
  @IsUUID()
  @IsOptional()
  authorId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((o) => o.categoryId !== null)
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
