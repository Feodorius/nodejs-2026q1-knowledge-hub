import { Injectable, Logger } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import { NotFoundError } from '../../common/errors';
import { ReindexRequestDto } from '../dto/reindex-request.dto';
import { ReindexResponseDto } from '../dto/reindex-response.dto';

// Fixed UUID v5 namespace for deterministic point IDs
const ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const BATCH_SIZE = 5;

@Injectable()
export class RagIndexService {
  private readonly logger = new Logger(RagIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
    private readonly chunking: ChunkingService,
  ) {}

  async indexArticles(req: ReindexRequestDto): Promise<ReindexResponseDto> {
    const onlyPublished = req.onlyPublished !== false;
    const where: Record<string, unknown> = {};
    if (onlyPublished) where.status = 'PUBLISHED';
    if (req.articleIds?.length) where.id = { in: req.articleIds };

    const articles = await this.prisma.article.findMany({
      where: where as any,
      include: { tags: { select: { name: true } } },
    });

    let indexedArticles = 0;
    let indexedChunks = 0;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);

      for (const article of batch) {
        const updatedAtMs = article.updatedAt.getTime();

        const existing = await this.qdrant.scrollByFilter(
          {
            must: [
              { key: 'articleId', match: { value: article.id } },
              { key: 'articleUpdatedAt', match: { value: updatedAtMs } },
            ],
          },
          1,
        );

        if (existing.length > 0) {
          this.logger.debug(`Skipping unchanged article ${article.id}`);
          continue;
        }

        await this.qdrant.deleteByArticleId(article.id);

        const chunks = this.chunking.chunkArticle({
          articleId: article.id,
          articleTitle: article.title,
          content: article.content,
          status: article.status.toLowerCase(),
          categoryId: article.categoryId ?? undefined,
          tags: article.tags.map((t) => t.name),
          updatedAt: article.updatedAt,
        });

        if (chunks.length === 0) continue;

        const texts = chunks.map((c) => c.content);
        const vectors = await this.embedding.embedDocuments(texts);

        const points = chunks.map((chunk, idx) => ({
          id: uuidv5(`${article.id}:${chunk.chunkIndex}`, ID_NAMESPACE),
          vector: vectors[idx],
          payload: chunk,
        }));

        await this.qdrant.upsertVectors(points);
        indexedArticles++;
        indexedChunks += chunks.length;
        this.logger.log(
          `Indexed article "${article.title}" (${chunks.length} chunks)`,
        );
      }
    }

    return {
      indexedArticles,
      indexedChunks,
      vectorCollection: this.qdrant.getCollectionName(),
    };
  }

  async deleteArticleFromIndex(articleId: string): Promise<void> {
    const existing = await this.qdrant.scrollByFilter(
      { must: [{ key: 'articleId', match: { value: articleId } }] },
      1,
    );

    if (existing.length === 0) {
      throw new NotFoundError(
        `No index entries found for article ${articleId}`,
      );
    }

    await this.qdrant.deleteByArticleId(articleId);
    this.logger.log(`Deleted index entries for article ${articleId}`);
  }
}
