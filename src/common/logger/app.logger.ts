import { LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type NestLogLevel = 'verbose' | 'debug' | 'log' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<NestLogLevel, number> = {
  verbose: 0,
  debug: 1,
  log: 2,
  warn: 3,
  error: 4,
};

const LEVEL_COLORS: Record<NestLogLevel, string> = {
  verbose: '\x1b[37m',
  debug: '\x1b[36m',
  log: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export class AppLogger implements LoggerService {
  private readonly logDir: string;
  private readonly logFile: string;
  private readonly maxFileSize: number;
  private readonly isProduction: boolean;
  private readonly minLevel: number;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.maxFileSize =
      parseInt(process.env.LOG_MAX_FILE_SIZE ?? '1024', 10) * 1024;
    this.isProduction = process.env.NODE_ENV === 'production';
    const level = (process.env.LOG_LEVEL ?? 'log') as NestLogLevel;
    this.minLevel = LEVEL_PRIORITY[level] ?? LEVEL_PRIORITY.log;

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message: any, context?: string): void {
    this.write('log', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: NestLogLevel,
    message: any,
    context?: string,
    trace?: string,
  ): void {
    if (LEVEL_PRIORITY[level] < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const msg = typeof message === 'string' ? message : JSON.stringify(message);

    let consoleLine: string;
    let fileLine: string;

    if (this.isProduction) {
      const entry: Record<string, any> = { timestamp, level, message: msg };
      if (context) entry.context = context;
      if (trace) entry.trace = trace;
      consoleLine = JSON.stringify(entry);
      fileLine = consoleLine;
    } else {
      const color = LEVEL_COLORS[level];
      const ctx = context ? ` ${BOLD}[${context}]${RESET}` : '';
      const levelStr = level.toUpperCase().padEnd(7);
      consoleLine = `${color}[${timestamp}] ${levelStr}${RESET}${ctx} ${msg}${
        trace ? `\n${trace}` : ''
      }`;
      fileLine = `[${timestamp}] ${levelStr} ${context ? `[${context}] ` : ''}${msg}${
        trace ? `\n${trace}` : ''
      }`;
    }

    if (level === 'error' || level === 'warn') {
      process.stderr.write(consoleLine + '\n');
    } else {
      process.stdout.write(consoleLine + '\n');
    }

    this.writeToFile(fileLine + '\n');
  }

  private writeToFile(content: string): void {
    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.logFile, content, 'utf8');
    } catch {
      // silently ignore file write failures to avoid infinite recursion
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) return;
      const stats = fs.statSync(this.logFile);
      if (stats.size >= this.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotated = path.join(this.logDir, `app-${timestamp}.log`);
        fs.renameSync(this.logFile, rotated);
      }
    } catch {
      // ignore rotation errors
    }
  }
}
