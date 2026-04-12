import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import {
  CategorySchema,
  ProductSchema,
  ProductImageSchema,
} from '../../database/schemas';
import { AuditLogModule } from '../auditlog/auditlog.module';

@Module({
  imports: [
    AuditLogModule,
    MongooseModule.forFeature([
      { name: 'Category', schema: CategorySchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'ProductImage', schema: ProductImageSchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
