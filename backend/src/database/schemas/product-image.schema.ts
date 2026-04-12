import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'product_images' })
export class ProductImage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop()
  altText?: string;

  @Prop({ default: 0 })
  displayOrder: number;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

ProductImageSchema.index({ productId: 1 });
