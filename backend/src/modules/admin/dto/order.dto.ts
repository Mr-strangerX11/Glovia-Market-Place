import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../database/schemas/order.schema';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @ApiProperty({ required: false, enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryPartner?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiProperty({ required: false, description: 'Discount amount in NPR' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  discount?: number;

  @ApiProperty({ required: false, description: 'Delivery charge in NPR' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  deliveryCharge?: number;
}
