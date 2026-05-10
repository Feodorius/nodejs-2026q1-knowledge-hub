import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';
import { RagChatService } from './services/rag-chat.service';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import { ReindexResponseDto } from './dto/reindex-response.dto';
import { RagSearchRequestDto } from './dto/rag-search-request.dto';
import { RagSearchResponseDto } from './dto/rag-search-response.dto';
import { RagChatRequestDto } from './dto/rag-chat-request.dto';
import { RagChatResponseDto } from './dto/rag-chat-response.dto';
import { ConversationMessage } from './rag.types';

@ApiTags('AI / RAG')
@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly ragIndex: RagIndexService,
    private readonly ragSearch: RagSearchService,
    private readonly ragChat: RagChatService,
  ) {}

  @Post('index')
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Index Knowledge Hub articles into vector storage' })
  index(@Body() dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.ragIndex.indexArticles(dto);
  }

  @Post('search')
  @HttpCode(200)
  @ApiOperation({ summary: 'Semantic search across indexed articles' })
  search(@Body() dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    return this.ragSearch.search(dto);
  }

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({ summary: 'Chat with Knowledge Hub using RAG' })
  chat(@Body() dto: RagChatRequestDto): Promise<RagChatResponseDto> {
    return this.ragChat.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove article vectors from index' })
  async deleteFromIndex(
    @Param('articleId', ParseUuidPipe) articleId: string,
  ): Promise<void> {
    return this.ragIndex.deleteArticleFromIndex(articleId);
  }

  @Get('chat/:conversationId/history')
  @ApiOperation({ summary: 'Get RAG conversation history' })
  getHistory(@Param('conversationId') conversationId: string): {
    conversationId: string;
    messages: ConversationMessage[];
  } {
    return this.ragChat.getHistory(conversationId);
  }
}
