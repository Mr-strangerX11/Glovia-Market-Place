import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import {
  ProductSchema,
  ProductImageSchema,
  CategorySchema,
  BrandSchema,
  ReviewSchema,
  UserSchema,
  ProductVariantSchema,
} from '../../database/schemas';
import { AuditLogModule } from '../auditlog/auditlog.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'ProductImage', schema: ProductImageSchema },
      { name: 'Category', schema: CategorySchema },
      { name: 'Brand', schema: BrandSchema },
      { name: 'Review', schema: ReviewSchema },
      { name: 'User', schema: UserSchema },
      { name: 'ProductVariant', schema: ProductVariantSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
