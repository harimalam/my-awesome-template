import { PermissionDefinition } from '../roles/interfaces/permission-definition.interface';

export const usersPermissions: PermissionDefinition[] = [
  { module: 'USERS', action: 'CREATE', description: 'Create users' },
  { module: 'USERS', action: 'READ', description: 'Read users' },
  { module: 'USERS', action: 'UPDATE', description: 'Update users' },
  { module: 'USERS', action: 'DELETE', description: 'Delete users' },
];
