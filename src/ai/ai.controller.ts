import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { AiCacheService } from './ai-cache.service';
import { AiUsageService } from './ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeResponseEntity } from './entities/summarize-response.entity';
import { TranslateResponseEntity } from './entities/translate-response.entity';
import { AnalyzeResponseEntity } from './entities/analyze-response.entity';
import { UsageResponseEntity } from './entities/usage-response.entity';
import { DiagnosticsResponseEntity } from './entities/diagnostics-response.entity';
import {
  buildSummarizePrompt,
  buildTranslatePrompt,
  buildAnalyzePrompt,
} from './prompts';
import { NotFoundError } from '../common/errors';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

interface AnalyzeShape {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(AiRateLimitGuard)
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly cache: AiCacheService,
    private readonly usage: AiUsageService,
  ) {}

  @ApiOperation({ summary: 'Summarize article content using AI' })
  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  async summarize(
    @Param('articleId', ParseUuidPipe) articleId: string,
    @Body() dto: SummarizeArticleDto,
  ): Promise<SummarizeResponseEntity> {
    const article = await this.findArticleOrFail(articleId);
    const maxLength = dto.maxLength ?? 'medium';

    const cacheKey = this.cache.buildKey(
      'summarize',
      articleId,
      article.updatedAt,
      { maxLength },
    );
    const cached = this.cache.get<SummarizeResponseEntity>(cacheKey);
    if (cached) return cached;

    const prompt = buildSummarizePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const start = Date.now();
    const result = await this.gemini.generateContent(prompt);
    const latencyMs = Date.now() - start;

    this.usage.track(
      'summarize',
      { input: result.inputTokens, output: result.outputTokens },
      latencyMs,
    );

    const response = new SummarizeResponseEntity({
      articleId,
      summary: result.text.trim(),
      originalLength: article.content.length,
      summaryLength: result.text.trim().length,
    });

    this.cache.set(cacheKey, response);
    return response;
  }

  @ApiOperation({ summary: 'Translate article content using AI' })
  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  async translate(
    @Param('articleId', ParseUuidPipe) articleId: string,
    @Body() dto: TranslateArticleDto,
  ): Promise<TranslateResponseEntity> {
    const article = await this.findArticleOrFail(articleId);

    const cacheKey = this.cache.buildKey(
      'translate',
      articleId,
      article.updatedAt,
      {
        targetLanguage: dto.targetLanguage,
        sourceLanguage: dto.sourceLanguage ?? '',
      },
    );
    const cached = this.cache.get<TranslateResponseEntity>(cacheKey);
    if (cached) return cached;

    const prompt = buildTranslatePrompt(
      article.title,
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const start = Date.now();
    const result = await this.gemini.generateContent(prompt);
    const latencyMs = Date.now() - start;

    this.usage.track(
      'translate',
      { input: result.inputTokens, output: result.outputTokens },
      latencyMs,
    );

    const parsed = this.parseTranslateResponse(result.text, articleId);
    this.cache.set(cacheKey, parsed);
    return parsed;
  }

  @ApiOperation({ summary: 'Analyze article content using AI' })
  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Param('articleId', ParseUuidPipe) articleId: string,
    @Body() dto: AnalyzeArticleDto,
  ): Promise<AnalyzeResponseEntity> {
    const article = await this.findArticleOrFail(articleId);
    const task = dto.task ?? 'review';

    const prompt = buildAnalyzePrompt(article.title, article.content, task);
    const start = Date.now();
    const result = await this.gemini.generateContent(prompt);
    const latencyMs = Date.now() - start;

    this.usage.track(
      'analyze',
      { input: result.inputTokens, output: result.outputTokens },
      latencyMs,
    );

    const parsed = this.parseAnalyzeResponse(result.text);
    return new AnalyzeResponseEntity({ articleId, ...parsed });
  }

  @ApiOperation({
    summary: 'Generic AI generation with optional conversation context',
  })
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body() dto: GenerateDto,
  ): Promise<{ response: string; sessionId?: string }> {
    const history = dto.sessionId ? this.usage.getHistory(dto.sessionId) : [];
    const prompt = dto.prompt;

    const start = Date.now();
    const result = await this.gemini.generateContent(prompt, history);
    const latencyMs = Date.now() - start;

    this.usage.track(
      'generate',
      { input: result.inputTokens, output: result.outputTokens },
      latencyMs,
    );

    if (dto.sessionId) {
      this.usage.appendHistory(dto.sessionId, dto.prompt, result.text);
    }

    return { response: result.text.trim(), sessionId: dto.sessionId };
  }

  @ApiOperation({ summary: 'Get AI usage statistics' })
  @Get('usage')
  getUsage(): UsageResponseEntity {
    return new UsageResponseEntity(this.usage.getStats());
  }

  @ApiOperation({ summary: 'Get AI diagnostics (latency, cache, usage)' })
  @Get('diagnostics')
  getDiagnostics(): DiagnosticsResponseEntity {
    return new DiagnosticsResponseEntity({
      usage: new UsageResponseEntity(this.usage.getStats()),
      cache: this.cache.getStats(),
      latency: this.usage.getLatencyStats(),
    });
  }

  private async findArticleOrFail(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundError(`Article ${id} not found`);
    return article;
  }

  private parseTranslateResponse(
    text: string,
    articleId: string,
  ): TranslateResponseEntity {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      if (typeof parsed.translatedText !== 'string')
        throw new Error('Invalid translatedText');
      if (typeof parsed.detectedLanguage !== 'string')
        throw new Error('Invalid detectedLanguage');

      return new TranslateResponseEntity({
        articleId,
        translatedText: parsed.translatedText,
        detectedLanguage: parsed.detectedLanguage,
      });
    } catch {
      return new TranslateResponseEntity({
        articleId,
        translatedText: text.trim(),
        detectedLanguage: 'unknown',
      });
    }
  }

  private parseAnalyzeResponse(text: string): AnalyzeShape {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      if (typeof parsed.analysis !== 'string')
        throw new Error('Invalid analysis');
      if (!Array.isArray(parsed.suggestions))
        throw new Error('Invalid suggestions');
      if (!['info', 'warning', 'error'].includes(parsed.severity as string))
        throw new Error('Invalid severity');

      return {
        analysis: parsed.analysis,
        suggestions: (parsed.suggestions as unknown[]).map(String),
        severity: parsed.severity as 'info' | 'warning' | 'error',
      };
    } catch {
      return {
        analysis: text.trim(),
        suggestions: [],
        severity: 'info',
      };
    }
  }
}
