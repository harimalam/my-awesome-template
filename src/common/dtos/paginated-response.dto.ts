import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T, Meta> {
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty()
  readonly meta: Meta;
}
