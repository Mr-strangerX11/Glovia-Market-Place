import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { BrandSchema, ProductSchema, ProductImageSchema, OrderItemSchema } from '../../database/schemas';
import { AuditLogModule } from '../auditlog/auditlog.module';

@Module({
  imports: [
    AuditLogModule,
    MongooseModule.forFeature([
      { name: 'Brand', schema: BrandSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'ProductImage', schema: ProductImageSchema },
      { name: 'OrderItem', schema: OrderItemSchema },
    ]),
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
