import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsUUID()
  articleId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  authorId?: string | null;
}
