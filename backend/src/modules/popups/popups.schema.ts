import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'popups' })
export class Popup extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  image?: string;

  @Prop()
  link?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  showOnce: boolean;

  @Prop()
  expiresAt?: Date;
}

export const PopupSchema = SchemaFactory.createForClass(Popup);
