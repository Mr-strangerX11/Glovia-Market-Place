import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'settings' })
export class Setting extends Document {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  type: string; // STRING, NUMBER, BOOLEAN, JSON

  @Prop()
  description?: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

// Note: key has unique: true in @Prop, so no need for explicit index
