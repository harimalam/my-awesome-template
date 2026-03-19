import { sql } from 'drizzle-orm';
import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

export const users = pgTable(
  'users',
  {
    // 1. UUIDv7 PRIMARY KEY: Contains a 48-bit timestamp + random bits.
    // It is naturally chronological, eliminating the need for complex sorting logic.
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // Dedicated descending index on the ID ensures fast cursor pagination
    index('users_cursor_pagination_idx').on(table.id.desc()),

    // Index for active users to speed up "deletedAt IS NULL" queries
    index('users_active_idx').on(table.deletedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
export type PublicUser = Omit<User, 'password' | 'deletedAt'>;
