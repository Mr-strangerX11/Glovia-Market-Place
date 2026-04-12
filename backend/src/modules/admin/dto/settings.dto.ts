import { IsNumber, Min, IsBoolean, IsOptional, IsNotEmpty, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateDeliverySettingsDto {
  @ApiProperty({ description: 'Free delivery threshold in NPR', example: 2999 })
  @IsNotEmpty({ message: 'Free delivery threshold is required' })
  @IsNumber({}, { message: 'freeDeliveryThreshold must be a number conforming to the specified constraints' })
  @Type(() => Number)
  @Min(0, { message: 'freeDeliveryThreshold must not be less than 0' })
  freeDeliveryThreshold: number;

  @ApiProperty({ description: 'Valley delivery charge in NPR', example: 99 })
  @IsNotEmpty({ message: 'Valley delivery charge is required' })
  @IsNumber({}, { message: 'valleyDeliveryCharge must be a number conforming to the specified constraints' })
  @Type(() => Number)
  @Min(0, { message: 'valleyDeliveryCharge must not be less than 0' })
  valleyDeliveryCharge: number;

  @ApiProperty({ description: 'Outside valley delivery charge in NPR', example: 149 })
  @IsNotEmpty({ message: 'Outside valley delivery charge is required' })
  @IsNumber({}, { message: 'outsideValleyDeliveryCharge must be a number conforming to the specified constraints' })
  @Type(() => Number)
  @Min(0, { message: 'outsideValleyDeliveryCharge must not be less than 0' })
  outsideValleyDeliveryCharge: number;
}

export class UpdateDiscountSettingsDto {
  @ApiProperty({ description: 'Enable or disable discount', example: true })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @ApiProperty({ required: false, description: 'Discount percentage (0-100)', example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'percentage must be a number conforming to the specified constraints' })
  @Type(() => Number)
  @Min(0, { message: 'percentage must not be less than 0' })
  @Max(100, { message: 'percentage cannot exceed 100' })
  percentage?: number;

  @ApiProperty({ required: false, description: 'Minimum order amount for discount in NPR', example: 1000 })
  @IsOptional()
  @IsNumber({}, { message: 'minOrderAmount must be a number conforming to the specified constraints' })
  @Type(() => Number)
  @Min(0, { message: 'minOrderAmount must not be less than 0' })
  minOrderAmount?: number;
}
