import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AiRateLimiterService } from '../ai-rate-limiter.service';
import { TooManyRequestsError } from '../../common/errors';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiter: AiRateLimiterService) {}

  canActivate(context: ExecutionContext): boolean {
    const { allowed, retryAfterSec } = this.rateLimiter.checkAndIncrement();

    if (!allowed) {
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('Retry-After', retryAfterSec);
      throw new TooManyRequestsError(
        `AI rate limit exceeded. Retry after ${retryAfterSec}s`,
      );
    }

    return true;
  }
}
