import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { QdrantService } from './services/qdrant.service';
import { EmbeddingService } from './services/embedding.service';
import { ChunkingService } from './services/chunking.service';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';
import { RagChatService } from './services/rag-chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [RagController],
  providers: [
    QdrantService,
    EmbeddingService,
    ChunkingService,
    RagIndexService,
    RagSearchService,
    RagChatService,
  ],
})
export class RagModule {}
