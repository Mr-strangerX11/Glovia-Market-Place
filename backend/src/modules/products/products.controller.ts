import { Controller, Get, Param, Query, Post, Body, Put, Delete, Req, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuditLogService } from '../auditlog/auditlog.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private auditLogService: AuditLogService,
  ) {}

  // Product Variant Endpoints
  @Get(':productId/variants')
  @ApiOperation({ summary: 'Get all variants for a product' })
  getVariants(@Param('productId') productId: string) {
    return this.productsService.getVariants(productId);
  }

  @Post(':productId/variants')
  @ApiOperation({ summary: 'Create a variant for a product' })
  createVariant(@Param('productId') productId: string, @Body() dto: any, @Req() req: any) {
    return this.productsService.createVariant(productId, dto, req.user);
  }

  @Put(':productId/variants/:variantId')
  @ApiOperation({ summary: 'Update a product variant' })
  updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.productsService.updateVariant(productId, variantId, dto, req.user);
  }

  @Delete(':productId/variants/:variantId')
  @ApiOperation({ summary: 'Delete a product variant' })
  async deleteVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Req() req: any,
  ) {
    const result = await this.productsService.deleteVariant(productId, variantId, req.user);
    const admin = req.user;
    await this.auditLogService.log(
      'DELETE_PRODUCT_VARIANT',
      admin._id,
      admin.email,
      productId,
      { variantId }
    );
    return result;
  }

  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get all products with filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  getFeatured(@Query('limit') limit?: string) {
    return this.productsService.getFeaturedProducts(
      limit ? Number(limit) : undefined,
    );
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Get best seller products' })
  getBestSellers(@Query('limit') limit?: string) {
    return this.productsService.getBestSellers(
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  getRelated(
    @Param('id') id: string,
    @Query('categoryId') categoryId: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getRelatedProducts(
      id,
      categoryId,
      limit ? Number(limit) : undefined,
    );
  }
}
