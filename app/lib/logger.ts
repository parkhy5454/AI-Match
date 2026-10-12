import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

// 로그 디렉토리 생성
if (!process.env.LOG_DIR) {
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    })
  ),
  defaultMeta: { service: 'ai-match' },
  transports: [
    // 에러 로그
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),

    // 전체 로그
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 30,
    }),

    // API 요청 로그
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 20,
    }),
  ],
});

// 프로덕션이 아니면 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration,
    userId,
  });
}

export function logApiError(
  method: string,
  path: string,
  error: Error,
  userId?: string
) {
  logger.error('API Error', {
    method,
    path,
    error: error.message,
    stack: error.stack,
    userId,
  });
}

export function logDatabaseQuery(query: string, duration: number) {
  logger.debug('Database Query', {
    query,
    duration,
  });
}

export function logAuthEvent(
  event: 'login' | 'logout' | 'signup' | 'password_reset',
  userId: string,
  success: boolean
) {
  logger.info('Auth Event', {
    event,
    userId,
    success,
  });
}
