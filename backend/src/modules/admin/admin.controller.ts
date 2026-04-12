import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Header,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminIpAllowlistGuard } from '../../common/guards/admin-ip-allowlist.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { HttpCode } from '@nestjs/common';
import { UserRole } from '../../database/schemas/user.schema';
import { OrderStatus } from '../../database/schemas/order.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateUserDto, UpdateUserRoleDto, FreezeVendorDto, UnfreezeVendorDto } from './dto/user.dto';
import { UpdateOrderDto } from './dto/order.dto';
import { UpdateDeliverySettingsDto, UpdateDiscountSettingsDto } from './dto/settings.dto';
import { UpdateAnnouncementDto } from './dto/announcement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from '../upload/upload.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminIpAllowlistGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
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
      quantityMl: parseNumber(body.quantityMl),
      discountPercentage: parseNumber(body.discountPercentage),
      isFeatured: parseBoolean(body.isFeatured),
      isBestSeller: parseBoolean(body.isBestSeller),
      isNew: parseBoolean(body.isNew),
      suitableFor: parseArray(body.suitableFor),
      tags: parseArray(body.tags),
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and optional role filter' })
  getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.getAllUsers(page, limit, role);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create new user with role' })
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('role') actorRole: UserRole,
  ) {
    return this.adminService.updateUserRole(id, dto.role, actorRole);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('vendors/:vendorId/freeze')
  @ApiOperation({ summary: 'Freeze vendor account' })
  freezeVendor(
    @Param('vendorId') vendorId: string,
    @Body() dto: FreezeVendorDto,
  ) {
    return this.adminService.freezeVendor(vendorId, dto.reason);
  }

  @Post('vendors/:vendorId/unfreeze')
  @ApiOperation({ summary: 'Unfreeze vendor account' })
  unfreezeVendor(
    @Param('vendorId') vendorId: string,
    @Body() dto: UnfreezeVendorDto,
  ) {
    return this.adminService.unfreezeVendor(vendorId, dto.reason);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create new product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Post('products/bulk')
  @ApiOperation({ summary: 'Bulk create products from JSON array' })
  bulkCreateProducts(@Body() body: { products: any[] }) {
    return this.adminService.bulkCreateProducts(body.products || []);
  }

  @Post('products/with-images')
  @ApiOperation({ summary: 'Create product with image upload' })
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
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({ summary: 'Update product' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Put('products/:id/with-images')
  @ApiOperation({ summary: 'Update product with image upload' })
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
  @ApiOperation({ summary: 'Delete product' })
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products (admin)' })
  getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
  ) {
    return this.adminService.getAllProducts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      categoryId,
      brandId,
    );
  }

  @Get('products/:id')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get product by ID (admin)' })
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  getAllOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllOrders(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status as any
    );
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order details by ID' })
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrderDetails(id);
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Update order status' })
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }

  @Delete('orders/:id')
  @ApiOperation({ summary: 'Delete order' })
  deleteOrder(@Param('id') id: string) {
    return this.adminService.deleteOrder(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers' })
  getAllCustomers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAllCustomers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get all reviews' })
  getAllReviews(
    @Query('isApproved') isApproved?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllReviews(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      isApproved ? isApproved === 'true' : undefined
    );
  }

  @Patch('reviews/:id/approve')
  @ApiOperation({ summary: 'Approve review' })
  approveReview(@Param('id') id: string) {
    return this.adminService.approveReview(id);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete review' })
  deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(id);
  }

  @Get('settings/delivery')
  @ApiOperation({ summary: 'Get delivery settings' })
  async getDeliverySettings() {
    return this.adminService.getDeliverySettings();
  }

  @Put('settings/delivery')
  @ApiOperation({ summary: 'Update delivery settings' })
  async updateDeliverySettings(@Body() dto: UpdateDeliverySettingsDto, @CurrentUser() user: any) {
    await this.adminService.updateDeliverySettings(dto, { userId: user?._id?.toString() || user?.id, username: user?.email || user?.username });
    return { ...dto, message: 'Delivery settings updated successfully' };
  }

  @Public()
  @Get('settings/announcement')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get announcement bar settings' })
  getAnnouncement() {
    return this.adminService.getAnnouncementBar();
  }

  @Put('settings/announcement')
  @ApiOperation({ summary: 'Update announcement bar' })
  updateAnnouncement(@Body() dto: UpdateAnnouncementDto, @CurrentUser() user: any) {
    return this.adminService.updateAnnouncementBar(dto, { userId: user?._id?.toString() || user?.id, username: user?.email || user?.username });
  }

  @Get('settings/discount')
  @ApiOperation({ summary: 'Get discount settings' })
  async getDiscountSettings() {
    const settings = await this.adminService.getDiscountSettings();
    return settings;
  }

  @Put('settings/discount')
  @ApiOperation({ summary: 'Update discount settings' })
  async updateDiscountSettings(@Body() dto: UpdateDiscountSettingsDto, @CurrentUser() user: any) {
    return this.adminService.updateDiscountSettings(dto, { userId: user?._id?.toString() || user?.id, username: user?.email || user?.username });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories for product creation' })
  async getCategories() {
    return this.adminService.getAllCategories();
  }

  // Banner Management Routes
  @Get('banners')
  @ApiOperation({ summary: 'Get all banners including inactive' })
  async getBanners() {
    return this.adminService.getAllBanners();
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Get banner by ID' })
  async getBanner(@Param('id') id: string) {
    return this.adminService.getBanner(id);
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create a new banner' })
  async createBanner(@Body() createBannerDto: any) {
    return this.adminService.createBanner(createBannerDto);
  }

  @Put('banners/:id')
  @ApiOperation({ summary: 'Update a banner' })
  async updateBanner(@Param('id') id: string, @Body() updateBannerDto: any) {
    return this.adminService.updateBanner(id, updateBannerDto);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a banner' })
  async deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  @Post('init')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Initialize default users (Super Admin, Admin, Vendor, User)' })
  async initializeUsers() {
    try {
      const result = await this.adminService.seedInitialUsers();
      return {
        status: 'success',
        message: 'Initial users created successfully',
        data: result,
      };
    } catch (error) {
      console.error('Init users failed:', error);
      return {
        status: 'error',
        message: error?.message || 'Failed to initialize users',
      };
    }
  }

  @Post('fix-superadmin')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Fix SuperAdmin role (temporary endpoint)' })
  async fixSuperAdmin() {
    try {
      const result = await this.adminService.fixSuperAdminRole();
      return {
        status: 'success',
        message: 'SuperAdmin role fixed',
        data: result,
      };
    } catch (error) {
      console.error('Init users failed:', error);
      return {
        status: 'error',
        message: error?.message || 'Failed to initialize users',
      };
    }
  }

  @Get('vendors/featured')
  @Public()
  @ApiOperation({ summary: 'Get all featured vendors' })
  async getFeaturedVendors() {
    return this.adminService.getFeaturedVendors();
  }

  @Get('vendors')
  @Public()
  @ApiOperation({ summary: 'Get all vendors' })
  async getAllVendors() {
    return this.adminService.getAllVendors();
  }

  @Patch('vendors/:id/featured')
  @ApiOperation({ summary: 'Toggle vendor featured status' })
  async toggleVendorFeatured(@Param('id') vendorId: string) {
    return this.adminService.toggleVendorFeatured(vendorId);
  }
}
