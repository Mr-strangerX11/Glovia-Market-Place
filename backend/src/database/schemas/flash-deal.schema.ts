import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class FlashDealProduct {
  @Prop({ required: true })
  productId: Types.ObjectId;

  @Prop()
  productName: string;

  @Prop()
  productImage?: string;

  @Prop({ required: true })
  originalPrice: number;

  @Prop({ required: true })
  salePrice: number;

  @Prop()
  discountPercentage?: number;
}

@Schema({ timestamps: true, collection: 'flash_deals' })
export class FlashDeal extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: [FlashDealProduct], required: true, default: [] })
  products: FlashDealProduct[];

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  adImage: string; // Main ad/banner image for full-screen display

  @Prop({ default: 0 })
  displayOrder: number;

  @Prop()
  createdBy: Types.ObjectId; // Admin/SuperAdmin who created it

  @Prop()
  updatedBy?: Types.ObjectId;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  clicks: number;
}

export const FlashDealSchema = SchemaFactory.createForClass(FlashDeal);

FlashDealSchema.index({ isActive: 1, endTime: 1 });
FlashDealSchema.index({ startTime: 1, endTime: 1 });
FlashDealSchema.index({ displayOrder: 1 });
