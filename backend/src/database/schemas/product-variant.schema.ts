import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'product_variants' })
export class ProductVariant extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g. "Red / Large"

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  compareAtPrice?: number;

  @Prop({ default: 0 })
  stockQuantity: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Map, of: String, default: {} })
  options: Record<string, string>; // e.g. { color: "Red", size: "Large" }
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);
