import { PublicUser } from '@core/database/schemas';
import { RedisService } from '@core/redis/redis.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersCache {
  private readonly LIST_TTL = 60; // 1 minute
  private readonly USER_TTL = 900; // 15 minutes
  private readonly LIST_VERSION_KEY = 'users:list:version';

  constructor(private readonly redisService: RedisService) {}

  private async getVersion(): Promise<number> {
    const v = await this.redisService.get<number>(this.LIST_VERSION_KEY);
    return v || 1;
  }

  async invalidateUserLists(): Promise<void> {
    await this.redisService.incr(this.LIST_VERSION_KEY);
  }
  async invalidateUser(id: string): Promise<void> {
    await this.redisService.del(`user:${id}`);
  }

  async getUsersByIds(ids: string[]): Promise<(PublicUser | null)[]> {
    if (!ids.length) return [];
    return this.redisService.mget<PublicUser>(ids.map((id) => `user:${id}`));
  }

  async setUsers(users: PublicUser[]): Promise<void> {
    await Promise.all(
      users.map((u) => {
        const jitter = Math.floor(Math.random() * 15); // Prevent cache stampede
        return this.redisService.set(`user:${u.id}`, u, this.USER_TTL + jitter);
      }),
    );
  }

  async setUser(user: PublicUser): Promise<void> {
    await this.redisService.set(`user:${user.id}`, user, this.USER_TTL);
  }

  async getUserList(page: number, limit: number, orderBy: string) {
    const v = await this.getVersion();
    return this.redisService.get<{ ids: string[]; total: number }>(`users:offset:v${v}:${page}:${limit}:${orderBy}`);
  }

  async setUserList(page: number, limit: number, orderBy: string, ids: string[], total: number) {
    const v = await this.getVersion();
    await this.redisService.set(`users:offset:v${v}:${page}:${limit}:${orderBy}`, { ids, total }, this.LIST_TTL);
  }

  async getCursorList(cursor: string | undefined, limit: number, orderBy: string) {
    const v = await this.getVersion();
    return this.redisService.get<{ ids: string[]; nextCursor: string | null }>(
      `users:cursor:v${v}:${cursor || 'start'}:${limit}:${orderBy}`,
    );
  }

  async setUserCursorList(
    cursor: string | undefined,
    limit: number,
    orderBy: string,
    ids: string[],
    nextCursor: string | null,
  ) {
    const v = await this.getVersion();
    await this.redisService.set(
      `users:cursor:v${v}:${cursor || 'start'}:${limit}:${orderBy}`,
      { ids, nextCursor },
      this.LIST_TTL,
    );
  }
}
