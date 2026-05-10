import { ApiProperty } from '@nestjs/swagger';

class RagSource {
  @ApiProperty()
  articleId: string;

  @ApiProperty()
  articleTitle: string;

  @ApiProperty()
  relevantChunk: string;
}

export class RagChatResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty({ type: [RagSource] })
  sources: RagSource[];

  @ApiProperty()
  conversationId: string;
}
