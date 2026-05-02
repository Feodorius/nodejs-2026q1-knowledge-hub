import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AiCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor() {
    const ttlSec = parseInt(process.env.AI_CACHE_TTL_SEC ?? '300', 10);
    this.ttlMs = ttlSec * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  buildKey(
    endpoint: string,
    articleId: string,
    updatedAt: Date,
    params: Record<string, unknown>,
  ): string {
    const sortedParams = Object.fromEntries(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
    );
    return `${endpoint}:${articleId}:${updatedAt.getTime()}:${JSON.stringify(sortedParams)}`;
  }

  getStats(): { size: number; hits: number; misses: number; hitRatio: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0,
    };
  }
}
