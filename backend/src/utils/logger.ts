import { getEnv } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor(logLevel?: string) {
    this.level = (logLevel?.toLowerCase() as LogLevel) || 'info';
    if (!LOG_LEVELS.hasOwnProperty(this.level)) {
      this.level = 'info';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log('🔍 DEBUG:', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log('ℹ️  INFO:', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn('⚠️  WARN:', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error('❌ ERROR:', ...args);
    }
  }

  section(title: string): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(60)}`);
  }

  success(...args: any[]): void {
    console.log('✅ SUCCESS:', ...args);
  }

  divider(): void {
    console.log(`${'─'.repeat(60)}`);
  }
}

export const logger = new Logger(getEnv('LOG_LEVEL', 'info'));
export default logger;
