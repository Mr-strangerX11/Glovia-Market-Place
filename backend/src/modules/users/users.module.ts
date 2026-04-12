import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './users.admin.controller';
import { UserSchema, AddressSchema, OrderSchema, OtpVerificationSchema } from '../../database/schemas';
import { AuditLogModule } from '../auditlog/auditlog.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Address', schema: AddressSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'OtpVerification', schema: OtpVerificationSchema },
    ]),
    AuditLogModule,
    VerificationModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
