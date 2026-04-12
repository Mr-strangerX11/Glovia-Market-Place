import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorActiveGuard } from '../../common/guards/vendor-active.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { AdminService } from './admin.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('Vendor')
@Controller('vendor')
@UseGuards(JwtAuthGuard, RolesGuard, VendorActiveGuard)
@Roles(UserRole.VENDOR, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class VendorController {
  constructor(
    private adminService: AdminService,
    private uploadService: UploadService,
  ) {}

  private parseProductFormData(body: any) {
    const parseNumber = (value: any) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    };

    const parseBoolean = (value: any) => {
      if (value === true || value === false) return value;
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return undefined;
    };

    const parseArray = (value: any) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return undefined;
    };

    return {
      ...body,
      price: parseNumber(body.price),
      compareAtPrice: parseNumber(body.compareAtPrice),
      stockQuantity: parseNumber(body.stockQuantity),
      discountPercentage: parseNumber(body.discountPercentage),
      isFeatured: parseBoolean(body.isFeatured),
      isBestSeller: parseBoolean(body.isBestSeller),
      isNew: parseBoolean(body.isNew),
      suitableFor: parseArray(body.suitableFor),
      tags: parseArray(body.tags),
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'List products (vendor view)' })
  getProducts(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllProducts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by id (vendor)' })
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product (vendor)' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Post('products/bulk')
  @ApiOperation({ summary: 'Bulk create products from JSON array (vendor)' })
  bulkCreateProducts(@Body() body: { products: any[] }) {
    return this.adminService.bulkCreateProducts(body.products || []);
  }

  @Post('products/with-images')
  @ApiOperation({ summary: 'Create product with image upload (vendor)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async createProductWithImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const payload = this.parseProductFormData(body) as CreateProductDto;
    if (files && files.length > 0) {
      const urls = await this.uploadService.uploadMultiple(files, 'products');
      payload.images = urls;
    }

    return this.adminService.createProduct(payload);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product (vendor)' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Put('products/:id/with-images')
  @ApiOperation({ summary: 'Update product with image upload (vendor)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async updateProductWithImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const payload: any = this.parseProductFormData(body);
    if (files && files.length > 0) {
      const urls = await this.uploadService.uploadMultiple(files, 'products');
      payload.images = urls.map((url: string, index: number) => ({
        url,
        isPrimary: index === 0,
      }));
    }

    return this.adminService.updateProduct(id, payload);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product (vendor)' })
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }
}
