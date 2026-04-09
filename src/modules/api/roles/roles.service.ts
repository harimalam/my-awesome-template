import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { RolesCache, HydratedRole } from './roles.cache';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly rolesCache: RolesCache,
  ) {}

  async getRoleWithPermissions(name: string): Promise<HydratedRole | null> {
    const cached = await this.rolesCache.getRole(name);
    if (cached) return cached;

    const role = await this.rolesRepository.findRoleByNameWithPermissions(name);
    if (!role) return null;

    await this.rolesCache.setRole(role);
    return role;
  }
}
