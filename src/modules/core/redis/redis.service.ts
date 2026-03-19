import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.redis.set(key, stringValue, 'EX', ttl);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delMany(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.redis.del(...keys);
  }

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    const pipeline = this.redis.pipeline();

    return new Promise((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          keys.forEach((key) => pipeline.del(key));
        }
      });

      stream.on('end', () => {
        void pipeline.exec().then(
          () => resolve(),
          (err) => reject(err instanceof Error ? err : new Error(String(err))),
        );
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async incr(key: string): Promise<number> {
    const result = await this.redis.incr(key);
    return result;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys);
    return values.map((v) => (v ? (JSON.parse(v) as T) : null));
  }
}
