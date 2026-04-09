import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesCache } from './roles.cache';
import { RolesRepository } from './roles.repository';
import { RolesSeeder } from './roles.seeder';

@Module({
  imports: [],
  controllers: [],
  providers: [RolesService, RolesRepository, RolesCache, RolesSeeder],
  exports: [RolesService],
})
export class RolesModule {}
