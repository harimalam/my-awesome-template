import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersCache } from './users.cache';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UsersCache],
})
export class UsersModule {}
