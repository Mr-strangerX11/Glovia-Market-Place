import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SkinType, VendorType } from '../../../database/schemas/user.schema';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, enum: SkinType })
  @IsOptional()
  @IsEnum(SkinType)
  skinType?: SkinType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiProperty({ required: false, enum: VendorType, description: 'Vendor type (only for vendors)' })
  @IsOptional()
  @IsEnum(VendorType)
  vendorType?: VendorType;

  @ApiProperty({ required: false, description: 'Vendor description (only for vendors)' })
  @IsOptional()
  @IsString()
  vendorDescription?: string;

  @ApiProperty({ required: false, description: 'Vendor logo URL (only for vendors)' })
  @IsOptional()
  @IsString()
  vendorLogo?: string;
}

export class SendEmailChangeOtpDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyEmailChangeOtpDto {
  @ApiProperty({ example: 'newemail@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;
}

export class CreateAddressDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Province 3' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Kathmandu' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Kathmandu Metropolitan City' })
  @IsString()
  municipality: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(35)
  wardNo: number;

  @ApiProperty({ example: 'Thamel' })
  @IsString()
  area: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  wardNo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
