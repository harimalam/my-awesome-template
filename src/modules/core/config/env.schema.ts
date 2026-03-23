import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['local', 'development', 'staging', 'production', 'test'])
    .default('local')
    .describe('The deployment environment'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ message: 'Invalid PostgreSQL URL format' }).describe('PostgreSQL connection string'),
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  RUN_MIGRATIONS: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535),
  REDIS_PASSWORD: z.string().optional(),
  RATE_LIMIT_DEFAULT: z.coerce.number().int().min(1).max(65535).default(360),
  API_HOST: z.string().optional(),
  MAIL_HOST: z.string(),
  MAIL_PORT: z.coerce.number().int().min(1).max(65535),
  MAIL_USER: z.string(),
  MAIL_PASS: z.string(),
  MAIL_FROM: z.string(),
  MAIL_SECURE: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;
