import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { VendorController } from './vendor.controller';
import { UploadModule } from '../upload/upload.module';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { Order, OrderSchema } from '../../database/schemas/order.schema';
import { OrderItem, OrderItemSchema } from '../../database/schemas/order-item.schema';
import { Review, ReviewSchema } from '../../database/schemas/review.schema';
import { Category, CategorySchema } from '../../database/schemas/category.schema';
import { Brand, BrandSchema } from '../../database/schemas/brand.schema';
import { ProductImage, ProductImageSchema } from '../../database/schemas/product-image.schema';
import { Setting, SettingSchema } from '../../database/schemas/setting.schema';
import { Address, AddressSchema } from '../../database/schemas/address.schema';
import { Banner, BannerSchema } from '../../database/schemas/banner.schema';
import { EmailNotificationService } from '../../common/services/email-notification.service';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit.schema';
import { SettingVersion, SettingVersionSchema } from '../../database/schemas/setting-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: ProductImage.name, schema: ProductImageSchema },
      { name: Setting.name, schema: SettingSchema },
      { name: Address.name, schema: AddressSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SettingVersion.name, schema: SettingVersionSchema },
      { name: Banner.name, schema: BannerSchema },
    ]),
    UploadModule,
  ],
  controllers: [AdminController, VendorController],
  providers: [AdminService, EmailNotificationService],
})
export class AdminModule {}
