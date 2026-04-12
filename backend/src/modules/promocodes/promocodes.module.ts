import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Coupon, CouponSchema } from '../../database/schemas/coupon.schema';
import { PromoCodesService } from './promocodes.service';
import { PromoCodesController } from './promocodes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
    ]),
  ],
  providers: [PromoCodesService],
  controllers: [PromoCodesController],
})
export class PromoCodesModule {}
