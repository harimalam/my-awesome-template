import { Global, Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';

import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { REDIS_CLIENT } from './redis/redis.constants';
import { MailModule } from './mail/mail.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    MailModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis): ThrottlerModuleOptions => ({
        storage: new ThrottlerStorageRedisService(redis),
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: config.get('RATE_LIMIT_DEFAULT'),
          },
        ],
      }),
    }),
  ],
  exports: [ConfigModule, DatabaseModule, RedisModule, ThrottlerModule],
})
export class CoreModule {}
