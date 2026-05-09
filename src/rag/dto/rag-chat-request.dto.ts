import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RagChatRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;
}
