import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { roles } from './roles.schema';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),

    roleId: uuid('role_id')
      .references(() => roles.id)
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('users_cursor_pagination_idx').on(table.id.desc()),
    index('users_active_idx').on(table.deletedAt),
    index('users_email_idx').on(table.email),
  ],
);
