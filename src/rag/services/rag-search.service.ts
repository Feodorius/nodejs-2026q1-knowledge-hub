import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';
import { QdrantService, QdrantResult } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { RagSearchRequestDto } from '../dto/rag-search-request.dto';
import { RagSearchResponseDto } from '../dto/rag-search-response.dto';
import { RagSearchResult } from '../rag.types';
import { STOP_WORDS } from '../rag.constants';

const RRF_K = 60;
const CANDIDATE_MULTIPLIER = 4;
const RERANK_POOL_SIZE = 20;

@Injectable()
export class RagSearchService {
  private readonly logger = new Logger(RagSearchService.name);

  constructor(
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
    private readonly gemini: GeminiService,
  ) {}

  async search(req: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    const limit = req.limit ?? 5;
    const candidateLimit = limit * CANDIDATE_MULTIPLIER;

    const queryVector = await this.embedding.embedQuery(req.query);
    const qdrantFilter = this.buildFilter(req);

    const semanticResults = await this.qdrant.searchSemantic(
      queryVector,
      candidateLimit,
      qdrantFilter,
    );

    const keywords = this.extractKeywords(req.query);
    let lexicalResults: QdrantResult[] = [];
    if (keywords.length > 0) {
      const lexicalFilter: Record<string, unknown> = {
        must: [
          { key: 'content', match: { text: keywords.join(' ') } },
          ...(qdrantFilter?.must ?? []),
        ],
      };
      lexicalResults = await this.qdrant
        .scrollByFilter(lexicalFilter, candidateLimit)
        .catch((err) => {
          this.logger.warn(
            'Lexical search failed, using semantic only',
            err?.message,
          );
          return [];
        });
    }

    const merged = this.mergeRRF(
      semanticResults,
      lexicalResults,
      RERANK_POOL_SIZE,
    );

    const reranked = await this.rerank(req.query, merged, limit);

    return {
      results: reranked.map((r) => ({
        articleId: r.articleId,
        articleTitle: r.articleTitle,
        chunk: r.chunk,
        similarity: r.similarity,
      })),
    };
  }

  async searchForContext(
    query: string,
    limit: number,
  ): Promise<RagSearchResult[]> {
    const result = await this.search({ query, limit });
    return result.results;
  }

  private buildFilter(
    req: RagSearchRequestDto,
  ): { must: Record<string, unknown>[] } | undefined {
    const must: Record<string, unknown>[] = [];

    if (req.articleStatus) {
      must.push({ key: 'status', match: { value: req.articleStatus } });
    }
    if (req.categoryId) {
      must.push({ key: 'categoryId', match: { value: req.categoryId } });
    }
    if (req.tags?.length) {
      must.push({ key: 'tags', match: { any: req.tags } });
    }

    return must.length > 0 ? { must } : undefined;
  }

  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  private mergeRRF(
    semanticList: QdrantResult[],
    lexicalList: QdrantResult[],
    topN: number,
  ): RagSearchResult[] {
    const scores = new Map<string, number>();
    const payloads = new Map<string, QdrantResult>();

    for (const [rank, item] of semanticList.entries()) {
      const key = item.id;
      scores.set(key, (scores.get(key) ?? 0) + 1 / (RRF_K + rank + 1));
      payloads.set(key, item);
    }

    for (const [rank, item] of lexicalList.entries()) {
      const key = item.id;
      scores.set(key, (scores.get(key) ?? 0) + 1 / (RRF_K + rank + 1));
      if (!payloads.has(key)) payloads.set(key, item);
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id, score]) => {
        const item = payloads.get(id)!;
        return {
          articleId: item.payload.articleId,
          articleTitle: item.payload.articleTitle,
          chunk: item.payload.content,
          similarity: score,
        };
      });
  }

  private async rerank(
    query: string,
    candidates: RagSearchResult[],
    limit: number,
  ): Promise<RagSearchResult[]> {
    if (candidates.length === 0) return [];
    if (candidates.length <= limit) return candidates;

    try {
      const chunkList = candidates
        .map((c, i) => `[${i}] ${c.chunk.slice(0, 300)}`)
        .join('\n\n');

      const prompt =
        `You are a relevance re-ranker. Rate each chunk's relevance to the query from 0.0 to 1.0.\n` +
        `Query: "${query}"\n\nChunks:\n${chunkList}\n\n` +
        `Return ONLY a JSON array of ${candidates.length} numbers (floats 0.0-1.0) in the same order. Example: [0.9, 0.3, 0.7]`;

      const result = await this.gemini.generateContent(prompt);
      const jsonMatch = result.text.match(/\[[\d.,\s]+\]/);
      if (!jsonMatch) throw new Error('No JSON array in re-rank response');

      const scores: number[] = JSON.parse(jsonMatch[0]);
      if (scores.length !== candidates.length)
        throw new Error('Score count mismatch');

      return candidates
        .map((c, i) => ({ ...c, similarity: scores[i] ?? c.similarity }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (err) {
      this.logger.warn(
        'Re-ranking failed, using hybrid scores',
        (err as Error).message,
      );
      return candidates.slice(0, limit);
    }
  }
}
