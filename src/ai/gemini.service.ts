import { Injectable, Logger } from '@nestjs/common';
import { AppError, ServiceUnavailableError } from '../common/errors';

export interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface GeminiContent {
  role: string;
  parts: { text: string }[];
}

interface GeminiApiResponse {
  candidates?: {
    content: { parts: { text: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.baseUrl =
      process.env.GEMINI_API_BASE_URL ??
      'https://generativelanguage.googleapis.com';
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  }

  async generateContent(
    prompt: string,
    history: ConversationMessage[] = [],
  ): Promise<GeminiResult> {
    const contents: GeminiContent[] = [
      ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    return this.withRetry(() => this.callApi(contents));
  }

  private async callApi(contents: GeminiContent[]): Promise<GeminiResult> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new ServiceUnavailableError(
        isAbort ? 'Gemini API request timed out' : 'Gemini API is unreachable',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const data = (await response.json()) as GeminiApiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    };
  }

  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401 || status === 403) {
      this.logger.error(`Gemini auth error: ${status}`);
      throw new AppError(500, 'AI service configuration error');
    }

    if (status === 429) {
      let body: Record<string, unknown> = {};
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch {
        // ignore parse error
      }

      const message = (body as any)?.error?.message ?? '';
      const isHardLimit = message.includes('limit: 0');

      if (isHardLimit) {
        throw new ServiceUnavailableError(
          'Gemini free tier quota is not available for this API key. Check your Google Cloud project billing settings.',
        );
      }

      const err = new ServiceUnavailableError('Gemini upstream rate limit');
      (err as any).__retryable = true;
      throw err;
    }

    throw new ServiceUnavailableError(
      `Gemini API returned unexpected status ${status}`,
    );
  }

  private async withRetry(
    fn: () => Promise<GeminiResult>,
  ): Promise<GeminiResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const isRetryable =
          err instanceof ServiceUnavailableError && (err as any).__retryable;

        if (!isRetryable || attempt === MAX_RETRIES) {
          break;
        }

        const delayMs = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Gemini rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (
      lastError instanceof ServiceUnavailableError &&
      (lastError as any).__retryable
    ) {
      throw new ServiceUnavailableError(
        'Gemini upstream rate limit exceeded after retries',
      );
    }
    throw lastError;
  }
}
