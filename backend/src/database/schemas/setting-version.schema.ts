import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'setting_versions' })
export class SettingVersion extends Document {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  username?: string;

  @Prop({ required: true })
  version: number;
}

export const SettingVersionSchema = SchemaFactory.createForClass(SettingVersion);
