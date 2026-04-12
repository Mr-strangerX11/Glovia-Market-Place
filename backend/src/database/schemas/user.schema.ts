import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  VENDOR = 'VENDOR',
  EDITOR = 'EDITOR',
  MARKETING = 'MARKETING',
  AUDITOR = 'AUDITOR',
}

export enum VendorType {
  BEAUTY = 'BEAUTY',
  PHARMACY = 'PHARMACY',
  COSMETICS = 'COSMETICS',
  SKINCARE = 'SKINCARE',
  FRAGRANCE = 'FRAGRANCE',
  WELLNESS = 'WELLNESS',
  ORGANIC = 'ORGANIC',
  LUXURY = 'LUXURY',
  MEDICAL = 'MEDICAL',
  OTHER = 'OTHER',
}

export enum SkinType {
  DRY = 'DRY',
  OILY = 'OILY',
  COMBINATION = 'COMBINATION',
  SENSITIVE = 'SENSITIVE',
  NORMAL = 'NORMAL',
}

@Schema({ timestamps: true, collection: 'users', suppressReservedKeysWarning: true })
export class User extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ sparse: true })
  phone?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;


  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({
    type: Object,
    default: {
      canEditProducts: false,
      canViewOrders: false,
      canManageUsers: false,
      canManageBanners: false,
      canViewAnalytics: false,
      canManagePromos: false,
      canViewAuditLogs: false,
    },
  })
  permissions: {
    canEditProducts?: boolean;
    canViewOrders?: boolean;
    canManageUsers?: boolean;
    canManageBanners?: boolean;
    canViewAnalytics?: boolean;
    canManagePromos?: boolean;
    canViewAuditLogs?: boolean;
    [key: string]: boolean | undefined;
  };

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({ type: String, enum: SkinType })
  skinType?: SkinType;

  @Prop()
  profileImage?: string;

  @Prop()
  refreshToken?: string;

  // Trust & Security
  @Prop({ default: 0 })
  trustScore: number;

  @Prop()
  deviceFingerprint?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: 0 })
  failedAttempts: number;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  lastLoginAt?: Date;

  // Vendor Features
  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  vendorDescription?: string;

  @Prop()
  vendorLogo?: string;

  @Prop({ type: String, enum: VendorType })
  vendorType?: VendorType;

  // Vendor Account Status
  @Prop({ default: false })
  isFrozen: boolean;

  @Prop()
  frozenAt?: Date;

  @Prop()
  frozenReason?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes: phone and email are unique, role for filtering
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
