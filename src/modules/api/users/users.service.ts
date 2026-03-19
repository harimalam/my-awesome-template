import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { PublicUser, User } from '@core/database/schemas';
import { UsersCache } from './users.cache';
import * as bcrypt from 'bcrypt';
import { CustomLogger } from '@common/utils/custom-logger.util';
import { SortOrder } from '@common/enums/sort-order.enum';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;
  private readonly logger = new CustomLogger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersCache: UsersCache,
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

    const hashedPassword = await bcrypt.hash(dto.password, await bcrypt.genSalt(this.SALT_ROUNDS));
    const user = await this.usersRepository.create({ ...dto, password: hashedPassword });

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
    await Promise.all([this.usersCache.invalidateUser(id)]);
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
}
