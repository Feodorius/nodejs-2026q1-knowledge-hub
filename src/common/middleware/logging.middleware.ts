import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
]);

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query } = req;
    const start = Date.now();

    const sanitizedBody = this.sanitize(req.body);
    this.logger.log(
      `→ ${method} ${originalUrl} query=${JSON.stringify(query)} body=${JSON.stringify(sanitizedBody)}`,
    );

    res.on('finish', () => {
      const ms = Date.now() - start;
      this.logger.log(`← ${method} ${originalUrl} ${res.statusCode} ${ms}ms`);
    });

    next();
  }

  private sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
