import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'token-from-email-link' })
  @IsUUID()
  token: string;
}
