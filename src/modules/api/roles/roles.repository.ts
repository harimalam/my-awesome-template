import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@core/database/database.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@core/database/schemas';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class RolesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async createRole(role: schema.NewRole) {
    return this.db.insert(schema.roles).values(role);
  }

  async findRoleByName(name: string) {
    return this.db.query.roles.findFirst({
      where: eq(schema.roles.name, name),
    });
  }

  async assignPermissionsToRole(roleName: string, permissionSlugs: string[]) {
    const role = await this.db.query.roles.findFirst({
      where: (r, { eq }) => eq(r.name, roleName),
    });

    if (!role) throw new Error(`Role ${roleName} not found`);

    const permissions = await this.db.query.permissions.findMany({
      where: (p, { inArray }) => inArray(p.slug, permissionSlugs),
    });

    if (!permissions.length) return;

    await this.db
      .insert(schema.rolePermissions)
      .values(
        permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      )
      .onConflictDoNothing();
  }

  /**
   * Fetches a role and flattens permissions into a string array
   * Returns: { id, name, permissions: ['user:create', 'user:read'] }
   */
  async findRoleByNameWithPermissions(name: string) {
    const role = await this.db.query.roles.findFirst({
      where: eq(schema.roles.name, name),
      with: {
        permissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions.map((rp) => rp.permission.slug),
    };
  }

  async findAllRoles() {
    return this.db.query.roles.findMany();
  }

  async findRoleById(id: string) {
    return this.db.query.roles.findFirst({
      where: eq(schema.roles.id, id),
    });
  }
  async createPermission(permission: schema.NewPermission) {
    return this.db.insert(schema.permissions).values(permission).onConflictDoNothing();
  }

  async findPermissionByName(slug: string) {
    return this.db.query.permissions.findFirst({
      where: eq(schema.permissions.slug, slug),
    });
  }

  async getAllPermissions() {
    return this.db.query.permissions.findMany();
  }

  async syncPermissions(permissions: schema.NewPermission[]) {
    if (!permissions.length) return;
    await this.db
      .insert(schema.permissions)
      .values(permissions)
      .onConflictDoUpdate({
        target: schema.permissions.slug,
        set: {
          description: sql`EXCLUDED.description`,
          module: sql`EXCLUDED.module`,
          action: sql`EXCLUDED.action`,
        },
      });
  }
}
