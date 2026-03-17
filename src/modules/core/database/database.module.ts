import { Module } from '@nestjs/common';
import { DrizzleProvider, DRIZZLE } from './database.provider';
import { MigrationService } from './migration.service';

@Module({
  providers: [DrizzleProvider, MigrationService],
  exports: [DRIZZLE, MigrationService],
})
export class DatabaseModule {}
