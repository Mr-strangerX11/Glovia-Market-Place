import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as schemas from './schemas';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: schemas.UserSchema },
      { name: 'Address', schema: schemas.AddressSchema },
      { name: 'Category', schema: schemas.CategorySchema },
      { name: 'Brand', schema: schemas.BrandSchema },
      { name: 'Product', schema: schemas.ProductSchema },
      { name: 'ProductImage', schema: schemas.ProductImageSchema },
      { name: 'CartItem', schema: schemas.CartItemSchema },
      { name: 'WishlistItem', schema: schemas.WishlistItemSchema },
      { name: 'Order', schema: schemas.OrderSchema },
      { name: 'OrderItem', schema: schemas.OrderItemSchema },
      { name: 'Payment', schema: schemas.PaymentSchema },
      { name: 'Review', schema: schemas.ReviewSchema },
      { name: 'Coupon', schema: schemas.CouponSchema },
      { name: 'Banner', schema: schemas.BannerSchema },
      { name: 'Blog', schema: schemas.BlogSchema },
      { name: 'OtpVerification', schema: schemas.OtpVerificationSchema },
      { name: 'Setting', schema: schemas.SettingSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
