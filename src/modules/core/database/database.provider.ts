import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ConfigService } from '../config/config.service';
import * as schema from './schemas';
import { CustomLogger } from '@common/utils/custom-logger.util';

export const DRIZZLE = Symbol('DRIZZLE_CLIENT');

export const DrizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const logger = new CustomLogger('DatabaseModule');
    const databaseUrl = configService.get('DATABASE_URL');
    const nodeEnv = configService.get('NODE_ENV');

    const queryClient = postgres(databaseUrl, {
      onnotice: (notice) => logger.verbose(`Postgres Notice: ${notice.message}`),
      connect_timeout: 10,
    });

    try {
      await queryClient`SELECT 1`;
      logger.log('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to the database. Check your DATABASE_URL.');
      throw error;
    }

    return drizzle(queryClient, { schema, logger: nodeEnv === 'local' ? true : false });
  },
};
