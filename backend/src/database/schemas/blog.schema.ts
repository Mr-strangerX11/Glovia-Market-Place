import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'blogs' })
export class Blog extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  excerpt: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  featuredImage?: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPublished: boolean;

  @Prop()
  publishedAt?: Date;

  @Prop()
  metaTitle?: string;

  @Prop()
  metaDescription?: string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Note: slug has unique: true in @Prop, so no need for explicit index
BlogSchema.index({ isPublished: 1 });
