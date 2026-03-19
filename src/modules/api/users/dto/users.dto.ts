import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class BaseUserDto {
  @ApiProperty({ example: 'Hari Malam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'hello@harimalam.in' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CreateUserDto extends BaseUserDto {
  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto extends PartialType(OmitType(BaseUserDto, ['email'] as const)) {}
export class UpdateUserPasswordDto extends PickType(CreateUserDto, ['password'] as const) {}

export class UserResponseDto extends BaseUserDto {
  @ApiProperty({ example: 'a0f8b2d1-1234-5678-9101-abcdef123456' })
  id: string;

  @ApiProperty({ example: '2026-03-18T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-18T10:00:00Z' })
  updatedAt: Date;
}
