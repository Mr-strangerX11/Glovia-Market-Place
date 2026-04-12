import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { EmailNotificationModule } from '../../common/services/email-notification.module';
import { TrustScoreGuard } from '../../common/guards/trust-score.guard';
import { Order, OrderSchema } from '../../database/schemas/order.schema';
import { OrderItem, OrderItemSchema } from '../../database/schemas/order-item.schema';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { Address, AddressSchema } from '../../database/schemas/address.schema';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { CartItem, CartItemSchema } from '../../database/schemas/cart-item.schema';
import { Coupon, CouponSchema } from '../../database/schemas/coupon.schema';
import { ProductImage, ProductImageSchema } from '../../database/schemas/product-image.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: CartItem.name, schema: CartItemSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: ProductImage.name, schema: ProductImageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PaymentsModule,
    EmailNotificationModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, TrustScoreGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
