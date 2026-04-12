import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ProductCategory {
  SKINCARE = 'SKINCARE',
  HAIRCARE = 'HAIRCARE',
  MAKEUP = 'MAKEUP',
  BODY_CARE = 'BODY_CARE',
  TOOLS_ACCESSORIES = 'TOOLS_ACCESSORIES',
  FRAGRANCE = 'FRAGRANCE',
  ORGANIC_NATURAL = 'ORGANIC_NATURAL',
  MENS_GROOMING = 'MENS_GROOMING',
  ORGANIC = 'ORGANIC',
  HERBAL = 'HERBAL',
}

@Schema({ timestamps: true, collection: 'categories' })
export class Category extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  @Prop({ type: String, enum: ProductCategory, required: true })
  type: ProductCategory;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  parentId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  displayOrder: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Note: slug has unique: true in @Prop, so no need for explicit index
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ isActive: 1 });
