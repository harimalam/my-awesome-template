import { ApiProperty } from '@nestjs/swagger';

export class OffsetPaginationMetaDto {
  @ApiProperty({ description: 'Total number of items across all pages', example: 150 })
  readonly total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  readonly page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  readonly limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 15 })
  readonly totalPages: number;
}

export class CursorPaginationMetaDto {
  @ApiProperty({ description: 'Indicates if there is another page of data', example: true })
  readonly hasNextPage: boolean;

  @ApiProperty({
    description: 'The cursor to send in the next request (UUIDv7)',
    example: '018e6b9c-5a3d-7b2a-8c1f-4e9d2a3b1c4f',
    nullable: true,
    type: String,
  })
  readonly nextCursor: string | null;
}
