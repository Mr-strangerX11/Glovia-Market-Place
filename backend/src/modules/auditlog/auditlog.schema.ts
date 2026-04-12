import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'auditlogs' })
export class AuditLog extends Document {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  performedBy: Types.ObjectId;

  @Prop({ required: true })
  performedByEmail: string;

  @Prop({ required: true })
  target: string;

  @Prop({ type: Object })
  details?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
