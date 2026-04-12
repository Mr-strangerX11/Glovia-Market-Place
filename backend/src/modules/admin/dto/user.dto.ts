import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { UserRole, VendorType } from '../../../database/schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/, {
    message: 'Password must include uppercase, lowercase, number, and special character.'
  })
  password: string;

  @ApiProperty({ example: 'First' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Last' })
  @IsString()
  lastName: string;

  @ApiProperty({ required: false, example: '+97798xxxxxxx' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.CUSTOMER;

  @ApiProperty({ enum: VendorType, required: false, description: 'Vendor type (only for VENDOR role)' })
  @IsOptional()
  @IsEnum(VendorType)
  vendorType?: VendorType;
}

export class FreezeVendorDto {
  @ApiProperty({ example: 'Violating terms of service', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UnfreezeVendorDto {
  @ApiProperty({ example: 'Account reinstated after review' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, example: 'VENDOR', description: 'New role for the user' })
  @IsEnum(UserRole, { message: 'role must be a valid UserRole (CUSTOMER, ADMIN, SUPER_ADMIN, VENDOR)' })
  @IsNotEmpty({ message: 'role is required' })
  role: UserRole;
}
