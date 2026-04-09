import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { PublicUser, User } from '@core/database/schemas';
import { UsersCache } from './users.cache';
import { SortOrder } from '@common/enums/sort-order.enum';
import { RolesService } from '@api/roles/roles.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  private readonly argon2Options = {
    type: argon2.argon2id,
    memoryCost: 12288, // 12 MB
    timeCost: 2, // 2 iterations
    parallelism: 1, // 1 thread
  };

  private readonly logger = new Logger('UsersService');

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersCache: UsersCache,
    private readonly rolesService: RolesService,
  ) {}

  private toPublic(user: User): PublicUser {
    const { password, deletedAt, ...rest } = user;
    void password;
    void deletedAt;
    return rest;
  }

  private async syncOffsetCache(
    page: number,
    limit: number,
    orderBy: string,
    result: { data: PublicUser[]; total: number },
  ) {
    try {
      await Promise.all([
        this.usersCache.setUserList(
          page,
          limit,
          orderBy,
          result.data.map((u: PublicUser) => u.id),
          result.total,
        ),
        this.usersCache.setUsers(result.data),
      ]);
    } catch (e) {
      this.logger.error('Offset Cache Sync Error', e);
    }
  }

  private async syncCursorCache(
    cursor: string | undefined,
    limit: number,
    orderBy: string,
    result: { data: PublicUser[]; nextCursor: string | null },
  ) {
    try {
      await Promise.all([
        this.usersCache.setUserCursorList(
          cursor,
          limit,
          orderBy,
          result.data.map((u: PublicUser) => u.id),
          result.nextCursor,
        ),
        this.usersCache.setUsers(result.data),
      ]);
    } catch (e) {
      this.logger.error('Cursor Cache Sync Error', e);
    }
  }

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.usersRepository.findOneActiveByEmail(dto.email);
    if (existing) throw new ConflictException('User with this email already exists');

    const defaultRole = await this.rolesService.getRoleWithPermissions('USER');
    if (!defaultRole) throw new InternalServerErrorException('Default Role not initialized');

    const hashedPassword = await argon2.hash(dto.password, this.argon2Options);

    const user = await this.usersRepository.create({
      ...dto,
      password: hashedPassword,
      roleId: defaultRole.id,
    });

    const publicUser = this.toPublic(user);
    await Promise.all([this.usersCache.setUser(publicUser), this.usersCache.invalidateUserLists()]);

    return publicUser;
  }

  async getUserById(id: string): Promise<PublicUser> {
    const [cachedUser] = await this.usersCache.getUsersByIds([id]);
    if (cachedUser) return cachedUser;

    const user = await this.usersRepository.findOneActiveById(id);
    if (!user) throw new NotFoundException('User not found');

    const publicUser = this.toPublic(user);
    await this.usersCache.setUser(publicUser);
    return publicUser;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.usersRepository.update(id, dto);
    if (!user) throw new NotFoundException('User not found');

    const publicUser = this.toPublic(user);
    await Promise.all([this.usersCache.invalidateUser(id), this.usersCache.invalidateUserPermissions(id)]);
    return publicUser;
  }

  async softDeleteUser(id: string): Promise<void> {
    const user = await this.usersRepository.softDelete(id);
    if (!user) throw new NotFoundException('User not found');

    await Promise.all([this.usersCache.invalidateUser(id), this.usersCache.invalidateUserLists()]);
  }

  async getUsersOffset({
    page = 1,
    limit = 10,
    orderBy = SortOrder.DESC,
  }: {
    page?: number;
    limit?: number;
    orderBy?: SortOrder;
  }) {
    const cachedList = await this.usersCache.getUserList(page, limit, orderBy);

    if (cachedList) {
      const cachedUsers = await this.usersCache.getUsersByIds(cachedList.ids);
      if (cachedUsers.length === cachedList.ids.length && !cachedUsers.includes(null)) {
        return {
          data: cachedUsers as PublicUser[],
          meta: { total: cachedList.total, page, limit, totalPages: Math.ceil(cachedList.total / limit) },
        };
      }
    }

    const result = await this.usersRepository.findAllActiveOffset({ page, limit, orderBy });

    void this.syncOffsetCache(page, limit, orderBy, result);

    return {
      data: result.data,
      meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async getUsersCursor({
    cursor,
    limit = 10,
    orderBy = SortOrder.DESC,
  }: {
    cursor?: string;
    limit?: number;
    orderBy?: SortOrder;
  }) {
    const cachedList = await this.usersCache.getCursorList(cursor, limit, orderBy);

    if (cachedList) {
      const cachedUsers = await this.usersCache.getUsersByIds(cachedList.ids);
      if (cachedUsers.length === cachedList.ids.length && !cachedUsers.includes(null)) {
        return {
          data: cachedUsers as PublicUser[],
          meta: { hasNextPage: !!cachedList.nextCursor, nextCursor: cachedList.nextCursor, limit },
        };
      }
    }

    const result = await this.usersRepository.findAllActiveCursor({ cursor, limit, orderBy });

    void this.syncCursorCache(cursor, limit, orderBy, result);

    return {
      data: result.data,
      meta: { hasNextPage: !!result.nextCursor, nextCursor: result.nextCursor, limit },
    };
  }

  async getUserPermissions(userId: string) {
    const cached = await this.usersCache.getUserPermissions(userId);
    if (cached) return cached;

    const userPermissions = await this.usersRepository.findUserWithPermissions(userId);
    if (!userPermissions) return { role: null, permissions: [] };

    const data = {
      role: userPermissions.role,
      permissions: userPermissions.permissions,
    };

    await this.usersCache.setUserPermissions(userId, data);
    return data;
  }
}
