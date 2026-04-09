import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { NewPermission, NewRole } from '@core/database/schemas';
import { RolesRepository } from './roles.repository';
import { usersPermissions } from '../users/permissions';
import { rolesPermissions } from './permissions';

@Injectable()
export class RolesSeeder implements OnModuleInit {
  private readonly logger = new Logger('RolesSeeder');

  private readonly roles: NewRole[] = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full access to all features',
    },
  ];

  private readonly permissionDefinitions = [...usersPermissions, ...rolesPermissions];

  constructor(private readonly rolesRepository: RolesRepository) {}

  async onModuleInit() {
    this.logger.log('Started dynamic seeding...');
    await this.seedRoles();
    await this.seedPermissions();
    await this.assignAllPermissionsToSuperAdmin();
    this.logger.log('Seeding completed.');
  }

  private async seedRoles() {
    for (const role of this.roles) {
      const existingRole = await this.rolesRepository.findRoleByName(role.name);
      if (!existingRole) {
        await this.rolesRepository.createRole(role);
        this.logger.log(`Created role: ${role.name}`);
      }
    }
  }

  private async seedPermissions() {
    const newPermissions: NewPermission[] = this.permissionDefinitions.map((p) => ({
      ...p,
      slug: `${p.module}:${p.action}`,
    }));

    await this.rolesRepository.syncPermissions(newPermissions);
    this.logger.log(`Synced ${newPermissions.length} permissions.`);
  }

  private async assignAllPermissionsToSuperAdmin() {
    const allPermissions = await this.rolesRepository.getAllPermissions();
    const slugs = allPermissions.map((p) => p.slug);
    await this.rolesRepository.assignPermissionsToRole('SUPER_ADMIN', slugs);
    this.logger.log('Assigned all permissions to SUPER_ADMIN.');
  }
}
