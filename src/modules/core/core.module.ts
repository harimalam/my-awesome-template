import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [],
  exports: [ConfigModule, DatabaseModule],
})
export class CoreModule {}
