import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  discountType: string; // PERCENTAGE, FIXED

  @Prop({ required: true })
  discountValue: number;

  @Prop()
  minOrderAmount?: number;

  @Prop()
  maxDiscount?: number;

  @Prop()
  usageLimit?: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validUntil: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Note: code has unique: true in @Prop, so no need for explicit index
CouponSchema.index({ isActive: 1 });
