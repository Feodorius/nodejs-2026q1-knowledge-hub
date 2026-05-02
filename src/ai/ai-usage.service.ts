import { Injectable } from '@nestjs/common';
import { ConversationMessage } from './gemini.service';

interface LatencyAccumulator {
  sum: number;
  min: number;
  max: number;
  count: number;
}

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly requestsByEndpoint: Record<string, number> = {};
  private readonly tokenUsage: TokenUsage = { input: 0, output: 0, total: 0 };
  private readonly latency: Record<string, LatencyAccumulator> = {};
  private readonly sessions = new Map<string, ConversationMessage[]>();

  track(
    endpoint: string,
    tokens?: { input?: number; output?: number },
    latencyMs?: number,
  ): void {
    this.totalRequests++;
    this.requestsByEndpoint[endpoint] =
      (this.requestsByEndpoint[endpoint] ?? 0) + 1;

    if (tokens) {
      const input = tokens.input ?? 0;
      const output = tokens.output ?? 0;
      this.tokenUsage.input += input;
      this.tokenUsage.output += output;
      this.tokenUsage.total += input + output;
    }

    if (latencyMs !== undefined) {
      if (!this.latency[endpoint]) {
        this.latency[endpoint] = {
          sum: 0,
          min: Infinity,
          max: -Infinity,
          count: 0,
        };
      }
      const acc = this.latency[endpoint];
      acc.sum += latencyMs;
      acc.count++;
      if (latencyMs < acc.min) acc.min = latencyMs;
      if (latencyMs > acc.max) acc.max = latencyMs;
    }
  }

  getStats() {
    return {
      totalRequests: this.totalRequests,
      requestsByEndpoint: { ...this.requestsByEndpoint },
      tokenUsage: { ...this.tokenUsage },
    };
  }

  getLatencyStats(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const result: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};
    for (const [key, acc] of Object.entries(this.latency)) {
      result[key] = {
        avg: acc.count > 0 ? Math.round(acc.sum / acc.count) : 0,
        min: acc.min === Infinity ? 0 : acc.min,
        max: acc.max === -Infinity ? 0 : acc.max,
        count: acc.count,
      };
    }
    return result;
  }

  getHistory(sessionId: string): ConversationMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  appendHistory(sessionId: string, userText: string, modelText: string): void {
    const history = this.sessions.get(sessionId) ?? [];
    history.push({ role: 'user', text: userText });
    history.push({ role: 'model', text: modelText });
    this.sessions.set(sessionId, history);
  }
}
