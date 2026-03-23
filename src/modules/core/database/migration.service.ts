import { Injectable } from '@nestjs/common';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ConfigService } from '@core/config/config.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private configService: ConfigService) {}

  async run() {
    const dbUrl = this.configService.get('DATABASE_URL');
    const isMingrationEnabled = this.configService.get('RUN_MIGRATIONS');

    if (!isMingrationEnabled) {
      this.logger.log('Migrations disabled');
      return;
    }

    const migrationClient = postgres(dbUrl, { max: 1, onnotice: () => {} });
    const db = drizzle(migrationClient);

    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      this.logger.log('Migrations Synced Successfully');
    } catch (error) {
      this.logger.error('Migration failed!', error);
      throw error;
    } finally {
      await migrationClient.end();
    }
  }
}
