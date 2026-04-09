import { RedisService } from '@core/redis/redis.service';
import { Injectable } from '@nestjs/common';

export interface HydratedRole {
  id: string;
  name: string;
  permissions: string[];
}

@Injectable()
export class RolesCache {
  private readonly ROLE_PREFIX = 'role:name:';
  private readonly TTL = 3600; // 1 Hour (Roles change rarely)

  constructor(private readonly redisService: RedisService) {}

  async getRole(name: string): Promise<HydratedRole | null> {
    return this.redisService.get<HydratedRole>(`${this.ROLE_PREFIX}${name}`);
  }

  async setRole(role: HydratedRole): Promise<void> {
    await this.redisService.set(`${this.ROLE_PREFIX}${role.name}`, role, this.TTL);
  }

  async invalidateRole(name: string): Promise<void> {
    await this.redisService.del(`${this.ROLE_PREFIX}${name}`);
  }
}
