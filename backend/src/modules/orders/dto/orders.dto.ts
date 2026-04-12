import { IsString, IsArray, IsOptional, IsEnum, IsBoolean, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../database/schemas/order.schema';

class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  addressId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  clearCart?: boolean;
}

export class TrackOrderDto {
  @ApiProperty({ example: 'ORD1739345345001' })
  @IsString()
  orderNumber: string;

  @ApiProperty({
    description: 'Customer email or phone number used to place the order',
    example: 'customer@example.com',
  })
  @IsString()
  identifier: string;
}
