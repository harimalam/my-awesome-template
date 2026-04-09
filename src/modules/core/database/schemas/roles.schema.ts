import { pgTable, text, uuid, index, primaryKey } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

// 1. Defined Roles (Admin, User, etc.)
export const roles = pgTable('roles', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text('name').notNull().unique(), // e.g., 'SUPER_ADMIN'
  description: text('description'),
});

// 2. Granular Permissions (e.g., 'user:create', 'project:delete')
export const permissions = pgTable('permissions', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  module: text('module').notNull(), // e.g., 'USERS'
  action: text('action').notNull(), // e.g., 'CREATE'
  slug: text('slug').notNull().unique(), // e.g., 'USERS:CREATE'
  description: text('description'),
});

// 3. Junction Table: Many-to-Many Role <-> Permission
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] }), index('rp_role_id_idx').on(t.roleId)],
);
