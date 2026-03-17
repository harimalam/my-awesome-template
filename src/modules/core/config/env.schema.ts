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
});

export type Env = z.infer<typeof envSchema>;
