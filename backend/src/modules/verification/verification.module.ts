import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { OtpService, EmailOtpService } from './otp.service';
import {
  UserSchema,
  AddressSchema,
  OrderSchema,
  OtpVerificationSchema,
} from '../../database/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Address', schema: AddressSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'OtpVerification', schema: OtpVerificationSchema },
    ]),
  ],
  controllers: [VerificationController],
  providers: [VerificationService, OtpService, EmailOtpService],
  exports: [VerificationService, OtpService, EmailOtpService],
})
export class VerificationModule {}
