import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    public readonly redis: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (data === null) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<'OK'> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl !== undefined) {
      return this.redis.set(key, stringValue, 'EX', ttl);
    }

    return this.redis.set(key, stringValue);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async delMany(keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);

    return values.map((v) => {
      if (v === null) return null;

      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    return new Promise((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (!keys.length) return;

        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.del(key));

        void pipeline.exec().catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));

          stream.destroy(error);
        });
      });

      stream.on('end', () => resolve());

      stream.on('error', (err) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }
}
