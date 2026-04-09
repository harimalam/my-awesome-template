import { PermissionDefinition } from './interfaces/permission-definition.interface';

export const rolesPermissions: PermissionDefinition[] = [
  { module: 'ROLES', action: 'CREATE', description: 'Create roles' },
  { module: 'ROLES', action: 'READ', description: 'Read roles' },
  { module: 'ROLES', action: 'UPDATE', description: 'Update roles' },
  { module: 'ROLES', action: 'DELETE', description: 'Delete roles' },
];
