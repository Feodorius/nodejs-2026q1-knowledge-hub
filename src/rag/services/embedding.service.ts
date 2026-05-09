import { Injectable, Logger } from '@nestjs/common';
import { AppError, ServiceUnavailableError } from '../../common/errors';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.baseUrl =
      process.env.GEMINI_API_BASE_URL ??
      'https://generativelanguage.googleapis.com';
    this.model = process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004';
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.withRetry(() => this.embedSingle(text, 'RETRIEVAL_QUERY'));
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.withRetry(() => this.embedBatch(texts));
  }

  private async embedSingle(text: string, taskType: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
          taskType,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new ServiceUnavailableError(
        isAbort
          ? 'Gemini embedding request timed out'
          : 'Gemini API is unreachable',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) await this.handleHttpError(response);

    const data = (await response.json()) as {
      embedding: { values: number[] };
    };
    return data.embedding.values;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new ServiceUnavailableError(
        isAbort
          ? 'Gemini embedding request timed out'
          : 'Gemini API is unreachable',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) await this.handleHttpError(response);

    const data = (await response.json()) as {
      embeddings: { values: number[] }[];
    };
    return data.embeddings.map((e) => e.values);
  }

  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401 || status === 403) {
      this.logger.error(`Gemini embedding auth error: ${status}`);
      throw new AppError(500, 'AI service configuration error');
    }

    if (status === 429) {
      let body: Record<string, unknown> = {};
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch {
        // ignore
      }
      const message = (body as any)?.error?.message ?? '';
      if (message.includes('limit: 0')) {
        throw new ServiceUnavailableError(
          'Gemini free tier quota exceeded for embeddings',
        );
      }
      const err = new ServiceUnavailableError('Gemini embedding rate limit');
      (err as any).__retryable = true;
      throw err;
    }

    throw new ServiceUnavailableError(
      `Gemini embedding API returned status ${status}`,
    );
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const isRetryable =
          err instanceof ServiceUnavailableError && (err as any).__retryable;
        if (!isRetryable || attempt === MAX_RETRIES) break;

        const delayMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Gemini embedding rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (
      lastError instanceof ServiceUnavailableError &&
      (lastError as any).__retryable
    ) {
      throw new ServiceUnavailableError(
        'Gemini embedding rate limit exceeded after retries',
      );
    }
    throw lastError;
  }
}
