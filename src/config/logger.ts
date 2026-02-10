import pino from 'pino';
import { env } from './env';

const transport = env.isDevelopment()
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: env.isDevelopment() ? 'debug' : 'info',
  transport,
  base: {
    env: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Logger helper methods
export function logRequest(method: string, url: string, statusCode: number, duration: number): void {
  logger.info({ method, url, statusCode, duration: `${duration}ms` }, 'HTTP Request');
}

export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error({ error: error.message, stack: error.stack, ...context }, 'Error occurred');
}

export function logAudit(
  action: string,
  userId: string,
  organizationId?: string,
  metadata?: Record<string, unknown>
): void {
  logger.info({ action, userId, organizationId, ...metadata }, 'Audit log');
}

export function logBusiness(event: string, data: Record<string, unknown>): void {
  logger.info({ event, ...data }, 'Business event');
}
