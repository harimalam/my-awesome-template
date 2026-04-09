import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';
import { users } from './users.schema';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Metadata for "Manage Devices" UI
    userAgent: text('user_agent'), // Browser/OS info
    ipAddress: text('ip_address'),

    lastActive: timestamp('last_active', { withTimezone: true }).defaultNow(),
    isRevoked: text('is_revoked').default('false'), // 'true' if manually logged out

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);
