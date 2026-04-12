import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum OtpPurpose {
  PHONE_VERIFICATION = 'phone_verification',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
}

export class SendOtpDto {
  @ApiProperty({ example: '+9779812345678' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.PHONE_VERIFICATION })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
