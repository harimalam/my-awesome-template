import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/users.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '@common/decorators/api-paginated-response.decorator';
import { CursorPaginationMeta, OffsetPaginationMeta, PaginatedResponse } from '@common/interfaces/pagination.interface';
import { CursorPaginationMetaDto, OffsetPaginationMetaDto } from '@common/dtos/pagination-meta.dto';
import { PublicUser } from '@core/database/schemas';
import { ErrorResponseDto } from '@common/dtos/error-response.dto';
import { UuidParamPipe } from '@common/pipes/uuid-param.pipe';
import { SortOrder } from '@common/enums/sort-order.enum';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'User with this email already exists' })
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User not found' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid UUID format' })
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id', UuidParamPipe) id: string): Promise<PublicUser> {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateUserDto })
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User not found' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid UUID format' })
  @ApiOperation({ summary: 'Update user by ID' })
  async update(@Param('id', UuidParamPipe) id: string, @Body() updateUserDto: UpdateUserDto): Promise<PublicUser> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User not found' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid UUID format' })
  @ApiOperation({ summary: 'Soft delete user by ID' })
  async softDeleteUser(@Param('id', UuidParamPipe) id: string): Promise<void> {
    return this.usersService.softDeleteUser(id);
  }

  @Get('offset')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: SortOrder,
    enumName: 'SortOrder',
    type: String,
  })
  @ApiPaginatedResponse({
    model: UserResponseDto,
    metaModel: OffsetPaginationMetaDto,
  })
  @ApiOperation({ summary: 'Get users with offset pagination' })
  async getUsersOffset(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: SortOrder,
  ): Promise<PaginatedResponse<UserResponseDto, OffsetPaginationMeta>> {
    return this.usersService.getUsersOffset({ page, limit, orderBy });
  }

  @Get('cursor')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: SortOrder,
    enumName: 'SortOrder',
    type: String,
  })
  @ApiPaginatedResponse({
    model: UserResponseDto,
    metaModel: CursorPaginationMetaDto,
  })
  @ApiOperation({ summary: 'Get users with cursor pagination' })
  async getUsersCursor(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: SortOrder,
  ): Promise<PaginatedResponse<UserResponseDto, CursorPaginationMeta>> {
    return this.usersService.getUsersCursor({ cursor, limit, orderBy });
  }
}
