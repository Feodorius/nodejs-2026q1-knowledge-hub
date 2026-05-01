import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';
import { AiCacheService } from './ai-cache.service';
import { AiRateLimiterService } from './ai-rate-limiter.service';
import { AiUsageService } from './ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    GeminiService,
    AiCacheService,
    AiRateLimiterService,
    AiUsageService,
    AiRateLimitGuard,
  ],
})
export class AiModule {}
