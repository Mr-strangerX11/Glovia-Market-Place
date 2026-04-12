import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ESEWA = 'ESEWA',
  KHALTI = 'KHALTI',
  IME_PAY = 'IME_PAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Schema({ timestamps: true, collection: 'orders' })
export class Order extends Document {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  addressId: Types.ObjectId;

  // Order Details
  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  deliveryCharge: number;

  @Prop({ required: true })
  total: number;

  // Status
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  // Notes
  @Prop()
  customerNote?: string;

  @Prop()
  adminNote?: string;

  // Tracking
  @Prop()
  trackingNumber?: string;

  @Prop()
  deliveryPartner?: string;

  // Dates
  @Prop()
  confirmedAt?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Note: orderNumber has unique: true in @Prop, so no need for explicit index
OrderSchema.index({ userId: 1 });
OrderSchema.index({ status: 1 });
