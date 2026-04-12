import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'otp_verifications' })
export class OtpVerification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  purpose: string; // 'phone_verification', 'login', 'password_reset'

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 0 })
  attempts: number;

  // Timestamps are added automatically by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const OtpVerificationSchema = SchemaFactory.createForClass(OtpVerification);

OtpVerificationSchema.index({ userId: 1 });
OtpVerificationSchema.index({ phone: 1 });
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
