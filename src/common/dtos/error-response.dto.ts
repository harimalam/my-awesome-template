import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ type: Number, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ type: String, description: 'Error message' })
  message: string;

  @ApiProperty({ type: String, description: 'Error details' })
  error: string;
}
