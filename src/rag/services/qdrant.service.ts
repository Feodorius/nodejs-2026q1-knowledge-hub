import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ServiceUnavailableError } from '../../common/errors';
import { ChunkPayload } from '../rag.types';

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

export interface QdrantResult {
  id: string;
  score: number;
  payload: ChunkPayload;
}

const VECTOR_SIZE = 3072;

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly collection: string;

  constructor() {
    const url = process.env.RAG_VECTOR_DB_URL ?? 'http://vectordb:6333';
    this.collection =
      process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';
    this.client = new QdrantClient({ url });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const { collections } = await this.client.getCollections();
      const exists = collections.some((c) => c.name === this.collection);

      if (!exists) {
        await this.client.createCollection(this.collection, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });

        await this.client.createPayloadIndex(this.collection, {
          field_name: 'content',
          field_schema: {
            type: 'text',
            tokenizer: 'word',
            lowercase: true,
          } as any,
        });
        await this.client.createPayloadIndex(this.collection, {
          field_name: 'articleId',
          field_schema: 'keyword',
        });
        await this.client.createPayloadIndex(this.collection, {
          field_name: 'articleUpdatedAt',
          field_schema: 'integer',
        });

        this.logger.log(`Created Qdrant collection: ${this.collection}`);
      }
    } catch (err) {
      this.logger.error('Failed to initialize Qdrant collection', err);
      throw new ServiceUnavailableError('Vector database is unavailable');
    }
  }

  async upsertVectors(points: QdrantPoint[]): Promise<void> {
    try {
      await this.client.upsert(this.collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload as unknown as Record<string, unknown>,
        })),
      });
    } catch (err) {
      this.logger.error('Qdrant upsert failed', err);
      throw new ServiceUnavailableError('Vector database is unavailable');
    }
  }

  async deleteByArticleId(articleId: string): Promise<void> {
    try {
      await this.client.delete(this.collection, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      });
    } catch (err) {
      this.logger.error(`Qdrant delete failed for article ${articleId}`, err);
      throw new ServiceUnavailableError('Vector database is unavailable');
    }
  }

  async searchSemantic(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<QdrantResult[]> {
    try {
      const results = await this.client.search(this.collection, {
        vector,
        limit,
        filter: filter as any,
        with_payload: true,
      });

      return results.map((r) => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload as unknown as ChunkPayload,
      }));
    } catch (err) {
      this.logger.error('Qdrant semantic search failed', err);
      throw new ServiceUnavailableError('Vector database is unavailable');
    }
  }

  async scrollByFilter(
    filter: Record<string, unknown>,
    limit: number,
  ): Promise<QdrantResult[]> {
    try {
      const result = await this.client.scroll(this.collection, {
        filter: filter as any,
        limit,
        with_payload: true,
      });

      return (result.points ?? []).map((p) => ({
        id: String(p.id),
        score: 1.0,
        payload: p.payload as unknown as ChunkPayload,
      }));
    } catch (err) {
      this.logger.error('Qdrant scroll failed', err);
      throw new ServiceUnavailableError('Vector database is unavailable');
    }
  }

  getCollectionName(): string {
    return this.collection;
  }
}
