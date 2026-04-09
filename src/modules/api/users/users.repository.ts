import { DRIZZLE } from '@core/database/database.provider';
import { Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@core/database/schemas';
import { and, asc, count, desc, eq, gt, isNull, lt, SQL } from 'drizzle-orm';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private readonly isActive = isNull(schema.users.deletedAt);

  private readonly publicColumns = {
    id: true,
    name: true,
    email: true,
    roleId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private withActive(condition?: SQL): SQL {
    return condition ? and(condition, this.isActive)! : this.isActive;
  }

  async create(data: schema.NewUser): Promise<schema.User> {
    const [user] = await this.db
      .insert(schema.users)
      .values(data)
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { ...data, createdAt: new Date(), deletedAt: null },
      })
      .returning();
    return user;
  }

  async findOneActiveById(id: string): Promise<schema.User | undefined> {
    return this.db.query.users.findFirst({
      where: this.withActive(eq(schema.users.id, id)),
    });
  }

  async findOneActiveByEmail(email: string): Promise<schema.User | undefined> {
    return this.db.query.users.findFirst({
      where: this.withActive(eq(schema.users.email, email)),
    });
  }

  async update(id: string, data: schema.UpdateUser): Promise<schema.User | undefined> {
    const [user] = await this.db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
    return user;
  }

  async softDelete(id: string): Promise<schema.User | undefined> {
    const [user] = await this.db
      .update(schema.users)
      .set({ deletedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async findAllActiveOffset({
    page = 1,
    limit = 10,
    orderBy = 'desc',
  }: {
    page?: number;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }): Promise<{ data: schema.PublicUser[]; total: number }> {
    const offset = (Math.max(page, 1) - 1) * limit;

    const [data, [totalRes]] = await Promise.all([
      this.db.query.users.findMany({
        where: this.isActive,
        limit,
        offset,
        orderBy: [orderBy === 'asc' ? asc(schema.users.id) : desc(schema.users.id)],
        columns: this.publicColumns,
        with: {
          role: true,
        },
      }),
      this.db.select({ count: count() }).from(schema.users).where(this.isActive),
    ]);

    return {
      data,
      total: Number(totalRes.count),
    };
  }

  async findAllActiveCursor({
    limit,
    cursor,
    orderBy = 'desc',
  }: {
    limit: number;
    cursor?: string;
    orderBy?: 'asc' | 'desc';
  }): Promise<{ data: schema.PublicUser[]; nextCursor: string | null }> {
    const direction = orderBy === 'asc' ? gt : lt;
    const orderFunc = orderBy === 'asc' ? asc : desc;

    const items = await this.db.query.users.findMany({
      where: and(this.isActive, cursor ? direction(schema.users.id, cursor) : undefined),
      limit: limit + 1,
      orderBy: [orderFunc(schema.users.id)],
      columns: this.publicColumns,
      with: {
        role: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const popped = items.pop();
      nextCursor = popped?.id ?? null;
    }

    return { data: items, nextCursor };
  }

  async findUserWithPermissions(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        role: {
          with: {
            permissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role) return null;

    return {
      id: user.id,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.slug),
    };
  }
}
