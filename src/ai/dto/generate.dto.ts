import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDto {
  @ApiProperty({ example: 'Explain the concept of event loop in Node.js' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Session ID for multi-turn conversation context',
    example: 'session-abc123',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
