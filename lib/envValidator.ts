/**
 * 환경 변수 검증 유틸리티
 * 애플리케이션 시작 시 필수 환경 변수 확인
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 필수 환경 변수 목록
 */
const REQUIRED_ENV_VARS = {
  NODE_ENV: {
    required: true,
    type: 'string',
    message: 'NODE_ENV is required',
  },
  JWT_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    message: 'JWT_SECRET is required and must be at least 32 characters',
  },
  RESET_TOKEN_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    message: 'RESET_TOKEN_SECRET is required and must be at least 32 characters',
  },
  DATABASE_URL: {
    required: true,
    type: 'string',
    message: 'DATABASE_URL is required (PostgreSQL URL)',
  },
  NEXT_PUBLIC_API_URL: {
    required: false,
    type: 'string',
    message: 'NEXT_PUBLIC_API_URL is optional',
  },
};

/**
 * 선택적 환경 변수 목록
 */
const OPTIONAL_ENV_VARS = {
  ACCESS_TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  ENFORCE_HTTPS: 'false',
  DEBUG_MODE: 'false',
  LOG_LEVEL: 'info',
  LOG_DIR: './logs',
  REDIS_URL: undefined,
  AWS_REGION: 'ap-northeast-2',
  NEXT_PUBLIC_SENTRY_DSN: undefined,
  NEXT_PUBLIC_SENTRY_ENABLED: 'false',
  SENTRY_DSN: undefined,
  SENTRY_ENABLED: 'false',
  SENTRY_ORG: 'ai-match',
  SENTRY_PROJECT: 'ai-match',
  SENTRY_AUTH_TOKEN: undefined,
  NEXT_PUBLIC_APP_VERSION: '1.0.0',
  BACKUP_ENABLED: 'true',
  BACKUP_S3_BUCKET: 'ai-match-backups',
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  BACKUP_CRON: '0 0 * * *',
  BACKUP_MAX_BACKUPS: '7',
  BACKUP_SLACK_WEBHOOK: undefined,
  BACKUP_EMAIL_ON_FAILURE: undefined,
};

/**
 * 환경 변수 검증
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env;

  // 필수 변수 검증
  for (const [varName, config] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!env[varName]) {
      errors.push(config.message);
    } else if (config.minLength && env[varName]!.length < config.minLength) {
      errors.push(
        `${varName} must be at least ${config.minLength} characters (current: ${env[varName]!.length})`
      );
    }
  }

  // 선택적 변수 경고
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!env[varName] && defaultValue) {
      warnings.push(`${varName} not set, using default: ${defaultValue}`);
    }
  }

  // 환경별 검증
  const nodeEnv = env.NODE_ENV;
  if (nodeEnv === 'production') {
    // 프로덕션 환경 추가 검증
    if (env.ENFORCE_HTTPS !== 'true') {
      warnings.push('ENFORCE_HTTPS should be true in production');
    }

    if (!env.ALLOWED_ORIGINS) {
      warnings.push('ALLOWED_ORIGINS not set in production');
    }

    if (env.DEBUG_MODE === 'true') {
      warnings.push('DEBUG_MODE should not be enabled in production');
    }

    // Sentry 검증
    if (!env.NEXT_PUBLIC_SENTRY_DSN && !env.SENTRY_DSN) {
      warnings.push('Sentry DSN not configured - error tracking disabled');
    }

    if (!env.SENTRY_AUTH_TOKEN) {
      warnings.push('SENTRY_AUTH_TOKEN not set - source maps upload may fail');
    }
  }

  // 데이터베이스 연결 검증
  const dbUrl = env.DATABASE_URL;
  if (dbUrl && !isValidDatabaseUrl(dbUrl)) {
    errors.push('DATABASE_URL format is invalid');
  }

  // URL 형식 검증
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  const frontendUrl = env.NEXT_PUBLIC_FRONTEND_URL;

  if (apiUrl && !isValidUrl(apiUrl)) {
    errors.push('NEXT_PUBLIC_API_URL is not a valid URL');
  }

  if (frontendUrl && !isValidUrl(frontendUrl)) {
    errors.push('NEXT_PUBLIC_FRONTEND_URL is not a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 데이터베이스 URL 형식 검증
 */
function isValidDatabaseUrl(url: string): boolean {
  try {
    // PostgreSQL 형식 검증
    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
      return false;
    }

    // URL 파싱
    const urlObj = new URL(url);
    return !!urlObj.hostname && !!urlObj.pathname;
  } catch {
    return false;
  }
}

/**
 * URL 형식 검증
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 환경 변수 인쇄 (민감한 정보 마스킹)
 */
export function printEnvironmentConfig(): void {
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    DATABASE: maskDatabaseUrl(process.env.DATABASE_URL),
    JWT_SECRET: maskSecret(process.env.JWT_SECRET),
    ENCRYPTION_KEY: maskSecret(process.env.ENCRYPTION_KEY),
    ENFORCE_HTTPS: process.env.ENFORCE_HTTPS || 'false',
    DEBUG_MODE: process.env.DEBUG_MODE || 'false',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };

  console.log('[Environment Configuration]');
  console.table(config);
}

/**
 * 데이터베이스 URL 마스킹
 */
function maskDatabaseUrl(url?: string): string {
  if (!url) return '(not set)';

  try {
    const urlObj = new URL(url);
    const password = urlObj.password ? '****' : '';
    const user = urlObj.username;
    const host = urlObj.hostname;
    const db = urlObj.pathname;

    return `postgres://${user}:${password}@${host}${db}`;
  } catch {
    return '(invalid)';
  }
}

/**
 * 비밀값 마스킹
 */
function maskSecret(secret?: string): string {
  if (!secret) return '(not set)';
  if (secret.length <= 4) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

/**
 * 환경 변수 결과 인쇄
 */
export function printValidationResult(result: EnvValidationResult): void {
  if (result.valid) {
    console.log('✅ [Environment Validation] All required variables are set');
  } else {
    console.error('❌ [Environment Validation] Failed');
    console.error('Errors:');
    result.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

/**
 * 애플리케이션 시작 시 환경 변수 검증 및 초기화
 */
export function initializeEnvironment(): void {
  // 서버 사이드에서만 실행
  if (typeof window !== 'undefined') {
    return;
  }

  console.log('[Environment] Initializing environment variables...');

  const result = validateEnvironment();

  if (!result.valid) {
    console.error('❌ [Environment] Validation failed');
    printValidationResult(result);
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }

  // 검증 통과
  printEnvironmentConfig();
  printValidationResult(result);

  console.log('✅ [Environment] Initialization complete');
}

/**
 * 환경 변수 가져오기 (타입 안전)
 */
export function getEnv<T = string>(
  key: string,
  defaultValue?: T,
  options?: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean';
  }
): T {
  const value = process.env[key] ?? defaultValue;

  if (options?.required && !value) {
    throw new Error(`Required environment variable not found: ${key}`);
  }

  // 타입 변환
  if (options?.type === 'number' && typeof value === 'string') {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return num as unknown as T;
  }

  if (options?.type === 'boolean' && typeof value === 'string') {
    return (value.toLowerCase() === 'true') as unknown as T;
  }

  return value as T;
}

/**
 * 환경 변수 사용 예시
 */
export function getAppConfig() {
  return {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    isProduction: getEnv('NODE_ENV') === 'production',
    isDevelopment: getEnv('NODE_ENV') === 'development',
    apiUrl: getEnv('NEXT_PUBLIC_API_URL', '', { required: true }),
    frontendUrl: getEnv('NEXT_PUBLIC_FRONTEND_URL', '', { required: true }),
    jwtSecret: getEnv('JWT_SECRET', '', { required: true }),
    encryptionKey: getEnv('ENCRYPTION_KEY', '', { required: true }),
    databaseUrl: getEnv('DATABASE_URL', '', { required: true }),
    accessTokenExpiry: getEnv('ACCESS_TOKEN_EXPIRY', '24h'),
    refreshTokenExpiry: getEnv('REFRESH_TOKEN_EXPIRY', '7d'),
    enforceHttps: getEnv('ENFORCE_HTTPS', 'false', { type: 'boolean' }),
    debugMode: getEnv('DEBUG_MODE', 'false', { type: 'boolean' }),
    // Logging Configuration
    logLevel: getEnv('LOG_LEVEL', 'info'),
    logDir: getEnv('LOG_DIR', './logs'),
    redisUrl: getEnv('REDIS_URL', undefined),
    awsRegion: getEnv('AWS_REGION', 'ap-northeast-2'),
    // Sentry Configuration
    sentryClientDsn: getEnv('NEXT_PUBLIC_SENTRY_DSN', undefined),
    sentryClientEnabled: getEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'false', { type: 'boolean' }),
    sentryServerDsn: getEnv('SENTRY_DSN', undefined),
    sentryServerEnabled: getEnv('SENTRY_ENABLED', 'false', { type: 'boolean' }),
    sentryOrg: getEnv('SENTRY_ORG', 'ai-match'),
    sentryProject: getEnv('SENTRY_PROJECT', 'ai-match'),
    sentryAuthToken: getEnv('SENTRY_AUTH_TOKEN', undefined),
    appVersion: getEnv('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
    // Backup Configuration
    backupEnabled: getEnv('BACKUP_ENABLED', 'true', { type: 'boolean' }),
    backupS3Bucket: getEnv('BACKUP_S3_BUCKET', 'ai-match-backups'),
    awsAccessKeyId: getEnv('AWS_ACCESS_KEY_ID', undefined),
    awsSecretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY', undefined),
    backupCron: getEnv('BACKUP_CRON', '0 0 * * *'),
    backupMaxBackups: getEnv('BACKUP_MAX_BACKUPS', '7', { type: 'number' }),
    backupSlackWebhook: getEnv('BACKUP_SLACK_WEBHOOK', undefined),
    backupEmailOnFailure: getEnv('BACKUP_EMAIL_ON_FAILURE', undefined),
  };
}

export type AppConfig = ReturnType<typeof getAppConfig>;
