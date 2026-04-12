import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../database/schemas/user.schema';
import { Product } from '../../database/schemas/product.schema';
import { Order, OrderStatus } from '../../database/schemas/order.schema';
import { OrderItem } from '../../database/schemas/order-item.schema';
import { Review } from '../../database/schemas/review.schema';
import { Category } from '../../database/schemas/category.schema';
import { Brand } from '../../database/schemas/brand.schema';
import { ProductImage } from '../../database/schemas/product-image.schema';
import { Setting } from '../../database/schemas/setting.schema';
import { AuditLog } from '../../database/schemas/audit.schema';
import { Address } from '../../database/schemas/address.schema';
import { SettingVersion } from '../../database/schemas/setting-version.schema';
import { Banner } from '../../database/schemas/banner.schema';
import { CreateUserDto } from './dto/user.dto';
import { UpdateProductDto, CreateProductDto } from './dto/product.dto';
import { EmailNotificationService } from '../../common/services/email-notification.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    @InjectModel(ProductImage.name) private productImageModel: Model<ProductImage>,
    @InjectModel(Setting.name) private settingModel: Model<Setting>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    @InjectModel(SettingVersion.name) private settingVersionModel: Model<SettingVersion>,
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    private emailNotificationService: EmailNotificationService,
  ) {}

  private sanitize(str: any): any {
    return typeof str === 'string' ? str.replace(/[<>"'`;]/g, '') : str;
  }

  async getDashboard() {
    const cancelledStatuses = [OrderStatus.CANCELLED, 'CANCELED'];
    const totalOrders = await this.orderModel.countDocuments();
    const totalRevenue = await this.orderModel.aggregate([
      {
        $match: {
          status: { $nin: cancelledStatuses }
        }
      },
      {
        $group: {
          _id: null,
          sum: { $sum: '$total' }
        }
      }
    ]);
    const totalCustomers = await this.userModel.countDocuments({ role: UserRole.CUSTOMER });
    const totalUsers = await this.userModel.countDocuments();
    const totalAdmins = await this.userModel.countDocuments({ role: UserRole.ADMIN });
    const totalVendors = await this.userModel.countDocuments({ role: UserRole.VENDOR });
    const totalProducts = await this.productModel.countDocuments();
    const pendingOrders = await this.orderModel.countDocuments({ status: OrderStatus.PENDING });

    // Recent orders with user info
    const recentOrders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    const userIds = [...new Set(
      recentOrders
        .map((o) => o?.userId?.toString?.())
        .filter(Boolean)
    )];
    const users = await this.userModel.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    const recentOrdersWithUsers = recentOrders.map(order => ({
      ...order,
      user: order?.userId ? userMap[order.userId.toString()] || null : null
    }));

    // Top selling products
    const topProducts = await this.orderItemModel.aggregate([
      {
        $group: {
          _id: '$productId',
          totalSold: { $sum: '$quantity' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    const productIds = topProducts.map(p => p._id);
    const products = await this.productModel.find({ _id: { $in: productIds } }).lean();
    const productMap = products.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {} as Record<string, any>);

    const topProductsWithDetails = topProducts.map(item => ({
      product: productMap[item._id.toString()] || null,
      totalSold: item.totalSold
    }));

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueByMonth = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $nin: cancelledStatuses }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.sum || 0,
      totalCustomers,
      totalUsers,
      totalAdmins,
      totalVendors,
      totalProducts,
      pendingOrders,
      recentOrders: recentOrdersWithUsers,
      topProducts: topProductsWithDetails,
      revenueByMonth
    };
  }

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email }).lean();
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Enforce strong password for ADMIN, SUPER_ADMIN, VENDOR
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if ((createUserDto.role === UserRole.ADMIN || createUserDto.role === UserRole.SUPER_ADMIN || createUserDto.role === UserRole.VENDOR) && !strong.test(createUserDto.password)) {
      throw new BadRequestException('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.toObject();
  }

  async getAllUsers(page: number = 1, limit: number = 10, role?: UserRole) {
    const skip = (page - 1) * limit;
    const filter = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).lean(),
      this.userModel.countDocuments(filter)
    ]);

    const usersWithId = users.map((user) => ({
      ...user,
      id: user._id.toString()
    }));

    return {
      data: usersWithId,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUserRole(userId: string, role: UserRole, adminRole: UserRole) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only SUPER_ADMIN can change roles to/from SUPER_ADMIN
    if (role === UserRole.SUPER_ADMIN || user.role === UserRole.SUPER_ADMIN) {
      if (adminRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only SUPER_ADMIN can modify SUPER_ADMIN roles');
      }
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).lean();
  }

  async deleteUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findByIdAndDelete(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async freezeVendor(vendorId: string, reason?: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendor ID');
    }

    const vendor = await this.userModel.findById(vendorId).lean();
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    return this.userModel.findByIdAndUpdate(
      vendorId,
      {
        isFrozen: true,
        frozenAt: new Date(),
        frozenReason: reason || 'Account frozen by admin',
      },
      { new: true }
    ).lean();
  }

  async unfreezeVendor(vendorId: string, reason?: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendor ID');
    }

    const vendor = await this.userModel.findById(vendorId).lean();
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    return this.userModel.findByIdAndUpdate(
      vendorId,
      {
        isFrozen: false,
        frozenAt: null,
        frozenReason: reason || 'Account unfrozen by admin',
      },
      { new: true }
    ).lean();
  }

  async getAllProducts(page: number = 1, limit: number = 10, categoryId?: string, brandId?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }
    if (brandId && Types.ObjectId.isValid(brandId)) {
      filter.brandId = new Types.ObjectId(brandId);
    }

    const [products, total] = await Promise.all([
      this.productModel.find(filter).skip(skip).limit(limit).lean(),
      this.productModel.countDocuments(filter)
    ]);

    // Get images, categories, brands
    const productIds = products.map(p => p._id);
    const categoryIds = [...new Set(products.map(p => p.categoryId?.toString()).filter(Boolean))];
    const brandIds = [...new Set(products.map(p => p.brandId?.toString()).filter(Boolean))];

    const [images, categories, brands] = await Promise.all([
      this.productImageModel.find({ productId: { $in: productIds } }).lean(),
      this.categoryModel.find({ _id: { $in: categoryIds } }).lean(),
      this.brandModel.find({ _id: { $in: brandIds } }).lean()
    ]);

    const imagesByProduct = images.reduce((acc, img) => {
      const key = img.productId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    }, {} as Record<string, any[]>);

    const categoryMap = categories.reduce((acc, c) => {
      acc[c._id.toString()] = c;
      return acc;
    }, {} as Record<string, any>);

    const brandMap = brands.reduce((acc, b) => {
      acc[b._id.toString()] = b;
      return acc;
    }, {} as Record<string, any>);

    const productsWithRelations = products.map(product => ({
      ...product,
      images: imagesByProduct[product._id.toString()] || [],
      category: product.categoryId ? categoryMap[product.categoryId.toString()] || null : null,
      brand: product.brandId ? brandMap[product.brandId.toString()] || null : null
    }));

    return {
      data: productsWithRelations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProduct(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findById(productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get images, category, brand
    const [images, category, brand] = await Promise.all([
      this.productImageModel.find({ productId: new Types.ObjectId(productId) }).lean(),
      product.categoryId ? this.categoryModel.findById(product.categoryId).lean() : null,
      product.brandId ? this.brandModel.findById(product.brandId).lean() : null
    ]);

    return {
      ...product,
      images,
      category,
      brand
    };
  }

  async createProduct(createProductDto: CreateProductDto) {
    const { images, categoryId, brandId, vendorId, isNew, ...productData } = createProductDto;
    try {
      // Validate categoryId
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException('Invalid category ID');
      }
      const category = await this.categoryModel.findById(categoryId).lean();
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      // Validate brandId if provided
      if (brandId) {
        if (!Types.ObjectId.isValid(brandId)) {
          throw new BadRequestException('Invalid brand ID');
        }
        const brand = await this.brandModel.findById(brandId).lean();
        if (!brand) {
          throw new NotFoundException('Brand not found');
        }
      }
      // Validate vendorId if provided
      if (vendorId) {
        if (!Types.ObjectId.isValid(vendorId)) {
          throw new BadRequestException('Invalid vendor ID');
        }
        const vendor = await this.userModel.findById(vendorId).lean();
        if (!vendor) {
          throw new NotFoundException('Vendor not found');
        }
      }
      // Check for unique SKU
      const existingSku = await this.productModel.findOne({ sku: productData.sku });
      if (existingSku) {
        throw new BadRequestException('SKU must be unique');
      }
      // Check for unique slug
      const existingSlug = await this.productModel.findOne({ slug: productData.slug });
      if (existingSlug) {
        throw new BadRequestException('Slug must be unique');
      }
      // Sanitize string fields
      const sanitizedData: any = {};
      for (const key in productData) {
        sanitizedData[key] = this.sanitize(productData[key]);
      }
      // Create product - map isNew to isNewProduct
      const product = new this.productModel({
        ...sanitizedData,
        categoryId: new Types.ObjectId(categoryId),
        brandId: brandId ? new Types.ObjectId(brandId) : null,
        vendorId: vendorId ? new Types.ObjectId(vendorId) : null,
        isNewProduct: isNew !== undefined ? isNew : false,
      });
      const savedProduct = await product.save();
      // Create images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        const imageDocuments = images.map((url: string, index: number) => ({
          productId: savedProduct._id,
          url: this.sanitize(url),
          isPrimary: index === 0,
          altText: null
        }));
        await this.productImageModel.insertMany(imageDocuments);
      }
      return savedProduct;
    } catch (error) {
      // Log error for monitoring
      console.error('Product creation failed:', error?.message || error);
      throw error;
    }
  }

  async updateProduct(productId: string, updateProductDto: UpdateProductDto) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productModel.findById(productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { images, isNew, categoryId, brandId, vendorId, ...productData } = updateProductDto;

    // Map isNew to isNewProduct
    const updateData: any = { ...productData };
    if (isNew !== undefined) {
      updateData.isNewProduct = isNew;
    }

    // Validate and set categoryId
    if (categoryId !== undefined) {
      if (!categoryId) {
        // Allow clearing categoryId
        updateData.categoryId = null;
      } else if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException(`Invalid category ID format: ${categoryId}`);
      } else {
        const categoryExists = await this.categoryModel.findById(categoryId).lean();
        if (!categoryExists) {
          throw new BadRequestException(`Category not found with ID: ${categoryId}`);
        }
        updateData.categoryId = new Types.ObjectId(categoryId);
      }
    }

    // Validate and set brandId
    if (brandId !== undefined) {
      if (!brandId) {
        // Allow clearing brandId
        updateData.brandId = null;
      } else if (!Types.ObjectId.isValid(brandId)) {
        throw new BadRequestException(`Invalid brand ID format: ${brandId}`);
      } else {
        const brandExists = await this.brandModel.findById(brandId).lean();
        if (!brandExists) {
          throw new BadRequestException(`Brand not found with ID: ${brandId}`);
        }
        updateData.brandId = new Types.ObjectId(brandId);
      }
    }

    // Validate and set vendorId
    if (vendorId !== undefined) {
      if (!vendorId) {
        // Allow clearing vendorId
        updateData.vendorId = null;
      } else if (!Types.ObjectId.isValid(vendorId)) {
        throw new BadRequestException(`Invalid vendor ID format: ${vendorId}`);
      } else {
        const vendorExists = await this.userModel.findById(vendorId).lean();
        if (!vendorExists) {
          throw new BadRequestException(`Vendor not found with ID: ${vendorId}`);
        }
        updateData.vendorId = new Types.ObjectId(vendorId);
      }
    }

    // Validate numeric fields
    if (updateData.price !== undefined && (typeof updateData.price !== 'number' || updateData.price < 0)) {
      throw new BadRequestException('Price must be a non-negative number');
    }
    if (updateData.stockQuantity !== undefined && (typeof updateData.stockQuantity !== 'number' || updateData.stockQuantity < 0)) {
      throw new BadRequestException('Stock quantity must be a non-negative number');
    }
    if (updateData.compareAtPrice !== undefined && updateData.compareAtPrice !== null && (typeof updateData.compareAtPrice !== 'number' || updateData.compareAtPrice < 0)) {
      throw new BadRequestException('Compare at price must be a non-negative number');
    }

    // Update product
    const updatedProduct = await this.productModel.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    ).lean();

    // Handle images if provided
    if (images && Array.isArray(images)) {
      // Delete old images
      await this.productImageModel.deleteMany({ productId: new Types.ObjectId(productId) });

      // Create new images
      if (images.length > 0) {
        const newImages = images.map((img: any, index: number) => ({
          productId: new Types.ObjectId(productId),
          url: typeof img === 'string' ? img : img.url,
          altText: (typeof img === 'object' && img.altText) || null,
          isPrimary: (typeof img === 'object' && img.isPrimary) || index === 0
        }));

        await this.productImageModel.insertMany(newImages);
      }
    }

    return updatedProduct;
  }

  async deleteProduct(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findByIdAndDelete(productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete associated images
    await this.productImageModel.deleteMany({ productId: new Types.ObjectId(productId) });

    return product;
  }

  async bulkCreateProducts(rows: any[]): Promise<{ success: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let success = 0;
    let failed = 0;

    // Pre-validate all rows and collect unique IDs/values for batch lookups
    const skus = new Set<string>();
    const slugs = new Set<string>();
    const categoryIds = new Set<string>();
    const brandIds = new Set<string>();
    const vendorIds = new Set<string>();

    for (const row of rows) {
      if (row.sku) skus.add(this.sanitize(row.sku));
      if (row.slug) slugs.add(this.sanitize(row.slug));
      if (row.categoryId && Types.ObjectId.isValid(row.categoryId)) categoryIds.add(row.categoryId);
      if (row.brandId && Types.ObjectId.isValid(row.brandId)) brandIds.add(row.brandId);
      if (row.vendorId && Types.ObjectId.isValid(row.vendorId)) vendorIds.add(row.vendorId);
    }

    // Batch DB lookups instead of per-row queries
    const lookups = await Promise.all([
      this.productModel.find({ sku: { $in: [...skus] } }, { sku: 1 }).lean(),
      this.productModel.find({ slug: { $in: [...slugs] } }, { slug: 1 }).lean(),
      this.categoryModel.find({ _id: { $in: [...categoryIds] } }, { _id: 1 }).lean(),
      brandIds.size > 0
        ? this.brandModel.find({ _id: { $in: [...brandIds] } }, { _id: 1 }).lean()
        : Promise.resolve([]),
      vendorIds.size > 0
        ? this.userModel.find({ _id: { $in: [...vendorIds] } }, { _id: 1 }).lean()
        : Promise.resolve([]),
    ]);

    const [existingSkus, existingSlugs, categories, brands, vendors] = lookups;

    const takenSkus = new Set(existingSkus.map((p: any) => p.sku));
    const takenSlugs = new Set(existingSlugs.map((p: any) => p.slug));
    const validCategoryIds = new Set(categories.map((c: any) => c._id.toString()));
    const validBrandIds = new Set(brands.map((b: any) => b._id.toString()));
    const validVendorIds = new Set(vendors.map((v: any) => v._id.toString()));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const { name, slug, description, price, compareAtPrice, sku, stockQuantity,
          categoryId, brandId, vendorId, ingredients, benefits, howToUse,
          isFeatured, isBestSeller, isNew, tags, imageUrls } = row;

        if (!name || !slug || !description || !sku || !categoryId) {
          throw new Error('Missing required fields: name, slug, description, sku, categoryId');
        }
        if (isNaN(Number(price)) || Number(price) < 0) throw new Error('Invalid price');
        if (isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0) throw new Error('Invalid stockQuantity');
        if (!Types.ObjectId.isValid(categoryId)) throw new Error(`Invalid categoryId: ${categoryId}`);
        if (!validCategoryIds.has(categoryId)) throw new Error(`Category not found: ${categoryId}`);
        if (brandId && !Types.ObjectId.isValid(brandId)) throw new Error(`Invalid brandId: ${brandId}`);
        if (brandId && !validBrandIds.has(brandId)) throw new Error(`Brand not found: ${brandId}`);
        if (vendorId && !Types.ObjectId.isValid(vendorId)) throw new Error(`Invalid vendorId: ${vendorId}`);
        if (vendorId && !validVendorIds.has(vendorId)) throw new Error(`Vendor not found: ${vendorId}`);

        const cleanSku = this.sanitize(sku);
        const cleanSlug = this.sanitize(slug);
        if (takenSkus.has(cleanSku)) throw new Error(`SKU already exists: ${sku}`);
        if (takenSlugs.has(cleanSlug)) throw new Error(`Slug already exists: ${slug}`);

        const product = new this.productModel({
          name: this.sanitize(name),
          slug: cleanSlug,
          description: this.sanitize(description),
          price: Number(price),
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
          sku: cleanSku,
          stockQuantity: Number(stockQuantity || 0),
          categoryId: new Types.ObjectId(categoryId),
          brandId: brandId ? new Types.ObjectId(brandId) : null,
          vendorId: vendorId ? new Types.ObjectId(vendorId) : null,
          ingredients: this.sanitize(ingredients),
          benefits: this.sanitize(benefits),
          howToUse: this.sanitize(howToUse),
          isFeatured: isFeatured === true || isFeatured === 'true',
          isBestSeller: isBestSeller === true || isBestSeller === 'true',
          isNewProduct: isNew === true || isNew === 'true',
          tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t: string) => t.trim()) : []),
          isActive: true,
        });
        const savedProduct = await product.save();

        // Create images if imageUrls provided
        if (imageUrls && imageUrls.trim()) {
          const urls = imageUrls.split(',').map((u: string) => u.trim()).filter(Boolean);
          if (urls.length > 0) {
            const imageDocuments = urls.map((url: string, index: number) => ({
              productId: savedProduct._id,
              url: this.sanitize(url),
              isPrimary: index === 0,
              altText: null
            }));
            await this.productImageModel.insertMany(imageDocuments);
          }
        }

        // Mark as taken so duplicates within the same batch are caught
        takenSkus.add(cleanSku);
        takenSlugs.add(cleanSlug);
        results.push({ row: i + 1, status: 'success', name, sku });
        success++;
      } catch (err: any) {
        results.push({ row: i + 1, status: 'failed', name: row.name, sku: row.sku, error: err.message });
        failed++;
      }
    }
    return { success, failed, results };
  }

  async getOrderDetails(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(orderId).lean();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get user details
    const user = await this.userModel.findById(order.userId).lean();

    // Get order items
    const orderItems = await this.orderItemModel.find({ orderId: order._id }).lean();

    return {
      ...order,
      user: user || null,
      items: orderItems || []
    };
  }

  async getAllOrders(page: number = 1, limit: number = 10, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.orderModel.countDocuments(filter)
    ]);

    // Get users
    const userIds = [...new Set(
      orders
        .map((o) => o?.userId?.toString?.())
        .filter(Boolean)
    )];
    const users = await this.userModel.find({ _id: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    // Get order items
    const orderIds = orders.map(o => o._id);
    const orderItems = await this.orderItemModel.find({ orderId: { $in: orderIds } }).lean();
    const itemsByOrder = orderItems.reduce((acc, item) => {
      const key = item.orderId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const ordersWithRelations = orders.map(order => ({
      ...order,
      user: order?.userId ? userMap[order.userId.toString()] || null : null,
      items: itemsByOrder[order._id.toString()] || []
    }));

    return {
      data: ordersWithRelations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    if (!status) {
      throw new BadRequestException('Order status is required');
    }

    const order = await this.orderModel.findById(orderId).lean();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === status) {
      return order;
    }

    const updateData: any = { status };

    if (status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (status === OrderStatus.SHIPPED) {
      updateData.shippedAt = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).lean();

    if (status === OrderStatus.CONFIRMED) {
      await this.sendOrderConfirmationEmail(orderId);
    }

    await this.sendOrderStatusChangedEmail(orderId, status);

    return updatedOrder;
  }

  async deleteOrder(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Delete associated order items first
    await this.orderItemModel.deleteMany({ orderId: order._id });

    // Delete the order
    await this.orderModel.findByIdAndDelete(orderId);

    return {
      message: 'Order deleted successfully',
      deletedOrderId: orderId
    };
  }

  private async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId).lean();
      if (!order) return;

      const user = await this.userModel.findById(order.userId).lean();
      if (!user?.email) return;

      const address = await this.addressModel.findById(order.addressId).lean();
      const items = await this.orderItemModel.find({ orderId: order._id }).lean();
      const productIds = items.map((item) => item.productId);
      const products = await this.productModel.find({ _id: { $in: productIds } }).lean();
      const productMap = products.reduce((acc, product) => {
        acc[product._id.toString()] = product;
        return acc;
      }, {} as Record<string, any>);

      const emailItems = items.map((item) => {
        const product = productMap[item.productId.toString()];
        return {
          name: product?.name || 'Product',
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        };
      });

      const adminEmail = process.env.ADMIN_ORDER_EMAIL || process.env.ADMIN_EMAIL;

      await this.emailNotificationService.sendOrderConfirmedEmail(
        {
          orderNumber: order.orderNumber,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          discount: Number(order.discount),
          deliveryCharge: Number(order.deliveryCharge),
          paymentMethod: order.paymentMethod,
          customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
          customerEmail: user.email,
          items: emailItems,
          address: {
            fullName: address?.fullName || 'Customer',
            phone: address?.phone || '',
            province: address?.province || '',
            district: address?.district || '',
            municipality: address?.municipality || '',
            wardNo: address?.wardNo || 0,
            area: address?.area || '',
            landmark: address?.landmark || undefined,
          },
        },
        adminEmail,
      );
    } catch (error) {
      // Do not block order update on email failure
    }
  }

  private async sendOrderStatusChangedEmail(orderId: string, status: OrderStatus): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId).lean();
      if (!order) return;

      const user = await this.userModel.findById(order.userId).lean();
      if (!user?.email) return;

      await this.emailNotificationService.sendOrderStatusChangedEmail({
        orderNumber: order.orderNumber,
        status,
        customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
        customerEmail: user.email,
        trackingNumber: order.trackingNumber,
        deliveryPartner: order.deliveryPartner,
        updatedAt: new Date(),
      });
    } catch (error) {
    }
  }

  async getAllCustomers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.userModel.find({ role: UserRole.CUSTOMER }).skip(skip).limit(limit).lean(),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER })
    ]);

    // Get order counts for each customer
    const customerIds = customers.map(c => c._id);
    const orderCounts = await this.orderModel.aggregate([
      {
        $match: { userId: { $in: customerIds } }
      },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);

    const orderCountMap = orderCounts.reduce((acc, item) => {
      acc[item._id.toString()] = {
        orderCount: item.orderCount,
        totalSpent: item.totalSpent
      };
      return acc;
    }, {} as Record<string, any>);

    const customersWithStats = customers.map(customer => ({
      ...customer,
      id: customer._id.toString(),
      orderCount: orderCountMap[customer._id.toString()]?.orderCount || 0,
      totalSpent: orderCountMap[customer._id.toString()]?.totalSpent || 0
    }));

    return {
      data: customersWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getAllReviews(page: number = 1, limit: number = 10, approved?: boolean) {
    const skip = (page - 1) * limit;
    const filter = approved !== undefined ? { approved } : {};

    const [reviews, total] = await Promise.all([
      this.reviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.reviewModel.countDocuments(filter)
    ]);

    // Get users and products
    const userIds = [...new Set(reviews.map(r => r.userId.toString()))];
    const productIds = [...new Set(reviews.map(r => r.productId.toString()))];

    const [users, products] = await Promise.all([
      this.userModel.find({ _id: { $in: userIds } }).lean(),
      this.productModel.find({ _id: { $in: productIds } }).lean()
    ]);

    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    const productMap = products.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {} as Record<string, any>);

    const reviewsWithRelations = reviews.map(review => ({
      ...review,
      user: userMap[review.userId.toString()] || null,
      product: productMap[review.productId.toString()] || null
    }));

    return {
      data: reviewsWithRelations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async approveReview(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findByIdAndUpdate(
      reviewId,
      { approved: true },
      { new: true }
    ).lean();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async deleteReview(reviewId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findByIdAndDelete(reviewId).lean();
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async updateDeliverySettings(data: { freeDeliveryThreshold: number; valleyDeliveryCharge: number; outsideValleyDeliveryCharge: number }, user?: { userId?: string, username?: string }) {
    const prev = await this.settingModel.findOne({ key: 'deliverySettings' }).lean();
    const settingsValue = JSON.stringify(data);
    // Versioning: Save previous version if exists
    if (prev) {
      const lastVersion = await this.settingVersionModel.find({ key: 'deliverySettings' }).sort({ version: -1 }).limit(1).lean();
      const nextVersion = lastVersion.length > 0 ? lastVersion[0].version + 1 : 1;
      await this.settingVersionModel.create({
        key: 'deliverySettings',
        value: prev.value,
        userId: user?.userId,
        username: user?.username,
        version: nextVersion
      });
    }
    const updated = await this.settingModel.findOneAndUpdate(
      { key: 'deliverySettings' },
      {
        key: 'deliverySettings',
        value: settingsValue
      },
      { upsert: true, new: true }
    ).lean();
    await this.auditLogModel.create({
      action: 'update',
      entity: 'deliverySettings',
      userId: user?.userId,
      username: user?.username,
      before: prev ? prev.value : '',
      after: settingsValue
    });
    return updated;
  }

  async getDeliverySettings() {
    const setting = await this.settingModel.findOne({ key: 'deliverySettings' }).lean();
    if (!setting) {
      return { 
        freeDeliveryThreshold: 2999,
        valleyDeliveryCharge: 99,
        outsideValleyDeliveryCharge: 149
      };
    }
    try {
      return JSON.parse(setting.value);
    } catch {
      return {
        freeDeliveryThreshold: 2999,
        valleyDeliveryCharge: 99,
        outsideValleyDeliveryCharge: 149
      };
    }
  }

  async updateAnnouncementBar(data: { enabled?: boolean; message?: string; backgroundColor?: string; textColor?: string }, user?: { userId?: string, username?: string }) {
    const prev = await this.settingModel.findOne({ key: 'announcementBar' }).lean();
    const enabled = typeof data.enabled === 'boolean' ? data.enabled : true;
    const message = data.message ?? '';
    const updateValue = JSON.stringify({
      enabled,
      message,
      backgroundColor: data.backgroundColor || '#FFD700',
      textColor: data.textColor || '#000000'
    });
    // Versioning: Save previous version if exists
    if (prev) {
      const lastVersion = await this.settingVersionModel.find({ key: 'announcementBar' }).sort({ version: -1 }).limit(1).lean();
      const nextVersion = lastVersion.length > 0 ? lastVersion[0].version + 1 : 1;
      await this.settingVersionModel.create({
        key: 'announcementBar',
        value: prev.value,
        userId: user?.userId,
        username: user?.username,
        version: nextVersion
      });
    }
    const updated = await this.settingModel.findOneAndUpdate(
      { key: 'announcementBar' },
      {
        key: 'announcementBar',
        value: updateValue
      },
      { upsert: true, new: true }
    ).lean();
    await this.auditLogModel.create({
      action: 'update',
      entity: 'announcementBar',
      userId: user?.userId,
      username: user?.username,
      before: prev ? prev.value : '',
      after: updateValue
    });
    return updated;
  }

  async getAnnouncementBar() {
    const setting = await this.settingModel.findOne({ key: 'announcementBar' }).lean();
    if (!setting) {
      return {
        enabled: false,
        isActive: false,
        message: '',
        text: '',
        icon: '🚚',
        backgroundColor: '#000000',
        textColor: '#ffffff'
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(setting.value);
    } catch {
      parsed = {
        enabled: false,
        message: '',
        backgroundColor: '#000000',
        textColor: '#ffffff'
      };
    }
    return {
      ...parsed,
      isActive: parsed.enabled,
      text: parsed.message,
      icon: parsed.icon || '🚚'
    };
  }

  async updateDiscountSettings(data: { enabled: boolean; percentage?: number; minOrderAmount?: number }, user?: { userId?: string, username?: string }) {
    const prev = await this.settingModel.findOne({ key: 'discountSettings' }).lean();
    const updateValue = JSON.stringify({
      enabled: data.enabled,
      percentage: data.percentage || 0,
      minOrderAmount: data.minOrderAmount || 0
    });
    // Versioning: Save previous version if exists
    if (prev) {
      const lastVersion = await this.settingVersionModel.find({ key: 'discountSettings' }).sort({ version: -1 }).limit(1).lean();
      const nextVersion = lastVersion.length > 0 ? lastVersion[0].version + 1 : 1;
      await this.settingVersionModel.create({
        key: 'discountSettings',
        value: prev.value,
        userId: user?.userId,
        username: user?.username,
        version: nextVersion
      });
    }
    const updated = await this.settingModel.findOneAndUpdate(
      { key: 'discountSettings' },
      {
        key: 'discountSettings',
        value: updateValue
      },
      { upsert: true, new: true }
    ).lean();
    await this.auditLogModel.create({
      action: 'update',
      entity: 'discountSettings',
      userId: user?.userId,
      username: user?.username,
      before: prev ? prev.value : '',
      after: updateValue
    });
    return updated;
  }

  async getDiscountSettings() {
    const setting = await this.settingModel.findOne({ key: 'discountSettings' }).lean();
    if (!setting) {
      return {
        enabled: false,
        percentage: 0,
        minOrderAmount: 0
      };
    }

    try {
      return JSON.parse(setting.value);
    } catch (e) {
      return {
        enabled: false,
        percentage: 0,
        minOrderAmount: 0
      };
    }
  }

  async getAllCategories() {
    try {
      const categories = await this.categoryModel
        .find({ isActive: true })
        .sort({ displayOrder: 1 })
        .lean();

      if (!categories || categories.length === 0) {
        throw new NotFoundException('No categories found. Please seed categories first using POST /categories/seed');
      }

      return {
        data: categories,
        count: categories.length,
        message: 'Categories retrieved successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve categories');
    }
  }

  async seedInitialUsers() {
    const users = [
      {
        email: 'superadmin@glovia.com.np',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+977-9800000001',
        role: UserRole.SUPER_ADMIN,
        isEmailVerified: true,
        trustScore: 100,
      },
      {
        email: 'admin@glovia.com.np',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+977-9800000002',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        trustScore: 100,
      },
      {
        email: 'vendor@glovia.com.np',
        password: 'Vendor123!',
        firstName: 'Vendor',
        lastName: 'Account',
        phone: '+977-9800000003',
        role: UserRole.VENDOR,
        isEmailVerified: true,
        trustScore: 75,
      },
      {
        email: 'user@glovia.com.np',
        password: 'User123!',
        firstName: 'Regular',
        lastName: 'User',
        phone: '+977-9800000004',
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        trustScore: 50,
      },
    ];

    const createdUsers = [];

    for (const userData of users) {
      const existingUser = await this.userModel.findOne({ email: userData.email });
      if (existingUser) {
        // Update role if it's incorrect (especially for superadmin)
        if (existingUser.role !== userData.role && userData.role === UserRole.SUPER_ADMIN) {
          await this.userModel.findByIdAndUpdate(existingUser._id, { role: userData.role });
          createdUsers.push({
            email: userData.email,
            status: 'role_updated_to_SUPER_ADMIN',
          });
        } else {
          createdUsers.push({
            email: userData.email,
            status: 'already_exists',
          });
        }
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await this.userModel.create({
        ...userData,
        password: hashedPassword,
      });

      createdUsers.push({
        email: userData.email,
        password: userData.password,
        role: userData.role,
        status: 'created',
      });
    }

    return createdUsers;
  }

  async fixSuperAdminRole() {
    const superadmin = await this.userModel.findOne({ email: 'superadmin@glovia.com.np' });
    if (!superadmin) {
      throw new NotFoundException('SuperAdmin user not found');
    }

    if (superadmin.role === UserRole.SUPER_ADMIN) {
      return { email: superadmin.email, role: superadmin.role, status: 'already_correct' };
    }

    await this.userModel.findByIdAndUpdate(superadmin._id, { role: UserRole.SUPER_ADMIN });
    return { email: superadmin.email, oldRole: superadmin.role, newRole: UserRole.SUPER_ADMIN, status: 'updated' };
  }

  // Banner Management Methods
  async getAllBanners() {
    return this.bannerModel.find().sort({ displayOrder: 1 }).lean();
  }

  async getBanner(id: string) {
    const banner = await this.bannerModel.findById(id).lean();
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async createBanner(createBannerDto: any) {
    const image = createBannerDto?.image || createBannerDto?.imageUrl;
    if (!image) {
      throw new BadRequestException('Banner image is required');
    }

    const payload = {
      title: createBannerDto?.title,
      subtitle: createBannerDto?.subtitle,
      image,
      mobileImage: createBannerDto?.mobileImage,
      link: createBannerDto?.link,
      displayOrder: Number.isFinite(Number(createBannerDto?.displayOrder))
        ? Number(createBannerDto.displayOrder)
        : (Number.isFinite(Number(createBannerDto?.priority)) ? Number(createBannerDto.priority) : 0),
      isActive: typeof createBannerDto?.isActive === 'boolean' ? createBannerDto.isActive : true,
    };

    const banner = new this.bannerModel(payload);
    try {
      return await banner.save();
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to create banner');
    }
  }

  async updateBanner(id: string, updateBannerDto: any) {
    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      updateBannerDto,
      { new: true }
    );
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async deleteBanner(id: string) {
    const banner = await this.bannerModel.findByIdAndDelete(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return { message: 'Banner deleted successfully' };
  }

  async getFeaturedVendors() {
    const vendors = await this.userModel
      .find({ role: UserRole.VENDOR, isFeatured: true })
      .select('_id email firstName lastName profileImage vendorLogo vendorDescription isFeatured')
      .lean();
    return {
      status: 'success',
      data: vendors,
      count: vendors.length,
    };
  }

  async getAllVendors() {
    const vendors = await this.userModel
      .find({ role: UserRole.VENDOR })
      .select('_id email firstName lastName profileImage vendorLogo vendorDescription isFeatured createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return {
      status: 'success',
      data: vendors,
      count: vendors.length,
    };
  }

  async toggleVendorFeatured(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendor ID');
    }

    const vendor = await this.userModel.findById(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    vendor.isFeatured = !vendor.isFeatured;
    await vendor.save();

    return {
      status: 'success',
      message: `Vendor ${vendor.isFeatured ? 'marked as featured' : 'removed from featured'}`,
      data: {
        _id: vendor._id,
        email: vendor.email,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        isFeatured: vendor.isFeatured,
      },
    };
  }
}
