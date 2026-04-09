export * from './users.schema';
export * from './roles.schema';
export * from './sessions.schema';
export * from './relations';

import { users } from './users.schema';
import { roles, permissions } from './roles.schema';
import { sessions } from './sessions.schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
export type PublicUser = Omit<User, 'password' | 'deletedAt'> & {
  role?: Role;
};

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export interface RedisSessionValue {
  userId: string;
  role: string;
  permissions: string[];
}
