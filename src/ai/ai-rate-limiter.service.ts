import { Injectable } from '@nestjs/common';

@Injectable()
export class AiRateLimiterService {
  private readonly rpm: number;
  private count = 0;
  private windowStart = Date.now();

  constructor() {
    this.rpm = parseInt(process.env.AI_RATE_LIMIT_RPM ?? '20', 10);
  }

  checkAndIncrement(): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.count = 0;
    }

    if (this.count >= this.rpm) {
      const retryAfterSec = Math.ceil((this.windowStart + 60_000 - now) / 1000);
      return { allowed: false, retryAfterSec };
    }

    this.count++;
    return { allowed: true, retryAfterSec: 0 };
  }
}
