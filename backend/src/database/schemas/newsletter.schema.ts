import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'newsletter_subscribers' })
export class NewsletterSubscriber extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  source?: string; // e.g. 'homepage', 'checkout'

  // Timestamps are automatically handled by Mongoose with timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const NewsletterSubscriberSchema = SchemaFactory.createForClass(NewsletterSubscriber);

NewsletterSubscriberSchema.index({ email: 1 }, { unique: true });
NewsletterSubscriberSchema.index({ isActive: 1 });
NewsletterSubscriberSchema.index({ createdAt: -1 });
