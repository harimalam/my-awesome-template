import { Module } from '@nestjs/common';
import { DrizzleProvider, DRIZZLE } from './database.provider';

@Module({
  providers: [DrizzleProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
