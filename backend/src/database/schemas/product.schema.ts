import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkinType } from './user.schema';

/**
 * Product Mongoose schema and document type
 *
 * The ProductDocument type is a best practice for type-safe Mongoose operations in NestJS.
 * It represents a hydrated Product document instance from the database.
 */
@Schema({ timestamps: true, collection: 'products' })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  ingredients?: string;

  @Prop()
  benefits?: string;

  @Prop()
  howToUse?: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  compareAtPrice?: number;

  @Prop({ default: 0 })
  discountPercentage?: number;

  @Prop()
  costPrice?: number;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop()
  barcode?: string;

  @Prop({ default: 0 })
  stockQuantity: number;

  @Prop({ default: 0 })
  quantityMl?: number;

  @Prop({ default: 10 })
  lowStockThreshold: number;

  @Prop()
  weight?: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brandId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  vendorId?: Types.ObjectId;

  @Prop({ type: [String], enum: SkinType, default: [] })
  suitableFor: SkinType[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isBestSeller: boolean;

  @Prop({ default: false })
  isNewProduct: boolean;

  @Prop()
  metaTitle?: string;

  @Prop()
  metaDescription?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Note: slug and sku have unique: true in @Prop, so no need for explicit index
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ isActive: 1, isFeatured: 1 });

// Type alias for a Product Mongoose document (for use with Model<ProductDocument>)
export type ProductDocument = Product & Document;
