import { Injectable } from '@nestjs/common';
import { ChunkPayload } from '../rag.types';

interface ArticleData {
  articleId: string;
  articleTitle: string;
  content: string;
  status: string;
  categoryId?: string | null;
  tags?: string[];
  updatedAt: Date;
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor() {
    this.chunkSize = parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10);
    this.chunkOverlap = parseInt(process.env.RAG_CHUNK_OVERLAP ?? '200', 10);
  }

  chunkArticle(article: ArticleData): ChunkPayload[] {
    const text = `${article.articleTitle}\n\n${article.content}`;
    const rawChunks = this.splitIntoChunks(text);

    return rawChunks.map((content, chunkIndex) => ({
      articleId: article.articleId,
      articleTitle: article.articleTitle,
      categoryId: article.categoryId ?? undefined,
      tags: article.tags ?? [],
      status: article.status,
      chunkIndex,
      articleUpdatedAt: article.updatedAt.getTime(),
      content,
    }));
  }

  private splitIntoChunks(text: string): string[] {
    const segments = text.split(/(?<=[.!?])\s+|\n\n+/);
    const chunks: string[] = [];
    let current = '';

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      if (current.length === 0) {
        current = trimmed;
        continue;
      }

      if (current.length + 1 + trimmed.length <= this.chunkSize) {
        current += ' ' + trimmed;
      } else {
        chunks.push(current);
        const overlap = current.slice(-this.chunkOverlap);
        current = overlap ? overlap + ' ' + trimmed : trimmed;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [text.slice(0, this.chunkSize)];
  }
}
