import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'promocodes' })
export class PromoCode extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  discountPercentage: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  usageLimit: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop()
  expiresAt?: Date;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
