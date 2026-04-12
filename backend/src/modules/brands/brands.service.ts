import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Brand, Product, ProductImage, OrderItem } from '../../database/schemas';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel('Brand') private brandModel: Model<Brand>,
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('ProductImage') private productImageModel: Model<ProductImage>,
    @InjectModel('OrderItem') private orderItemModel: Model<OrderItem>,
  ) {}

  // Public: Get all brands
  async getAllBrands(includeProducts = false) {
    const brands = await this.brandModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    if (!includeProducts) {
      return brands;
    }

    const brandIds = brands.map((brand) => brand._id);
    const productIdsByBrand = await this.productModel
      .aggregate([
        { $match: { brandId: { $in: brandIds } } },
        {
          $group: {
            _id: '$brandId',
            products: { $push: '$_id' },
          },
        },
      ]);

    const productsByBrandId = productIdsByBrand.reduce<Record<string, any>>((acc, item) => {
      acc[item._id.toString()] = item.products.map((id: Types.ObjectId) => ({ id }));
      return acc;
    }, {});

    return brands.map((brand) => ({
      ...brand,
      products: productsByBrandId[brand._id.toString()] || [],
    }));
  }

  // Public: Get brand by slug with products
  async getBrandBySlug(slug: string) {
    const brand = await this.brandModel.findOne({ slug }).lean();

    if (!brand) {
      return null;
    }

    const products = await this.productModel
      .find({ brandId: new Types.ObjectId(brand._id), isActive: true })
      .select('name slug description price stockQuantity categoryId brandId createdAt')
      .lean();

    const productIds = products.map((product) => product._id);
    const images = await this.productImageModel
      .find({ productId: { $in: productIds } })
      .sort({ displayOrder: 1 })
      .lean();

    const imagesByProductId = images.reduce<Record<string, any[]>>((acc, image) => {
      const key = image.productId.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(image);
      return acc;
    }, {});

    const productsWithImages = products.map((product) => ({
      ...product,
      images: imagesByProductId[product._id.toString()] || [],
      brand,
    }));

    return {
      ...brand,
      products: productsWithImages,
    };
  }

  // Public: Get brand by ID with product count
  async getBrandById(id: string) {
    const brand = await this.brandModel.findById(id).lean();

    if (!brand) {
      return null;
    }

    const [productCount, products] = await Promise.all([
      this.productModel.countDocuments({ brandId: new Types.ObjectId(id) }),
      this.productModel
        .find({ brandId: new Types.ObjectId(id) })
        .select('_id')
        .limit(5)
        .lean(),
    ]);

    return {
      ...brand,
      _count: { products: productCount },
      products: products.map((product) => ({ id: product._id })),
    };
  }

  // Admin: Create new brand
  async createBrand(dto: CreateBrandDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');

    return this.brandModel.create({
      name: dto.name,
      slug,
      description: dto.description,
      logo: dto.logo,
      isActive: true,
    });
  }

  // Admin: Update brand
  async updateBrand(id: string, dto: UpdateBrandDto) {
    return this.brandModel.findByIdAndUpdate(
      id,
      {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        logo: dto.logo,
        isActive: dto.isActive,
      },
      { new: true }
    );
  }

  // Admin: Soft delete brand (deactivate)
  async deleteBrand(id: string) {
    return this.brandModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  // Admin: Hard delete brand (only if no products)
  async hardDeleteBrand(id: string) {
    const productCount = await this.productModel.countDocuments({ brandId: new Types.ObjectId(id) });

    if (productCount > 0) {
      throw new Error('Cannot delete brand with associated products');
    }

    return this.brandModel.findByIdAndDelete(id);
  }

  // Admin: Get brand analytics for dashboard
  async getBrandAnalytics() {
    const [totalBrands, activeBrands, brandCounts] = await Promise.all([
      this.brandModel.countDocuments({ isActive: true }),
      this.brandModel.countDocuments({ isActive: true }),
      this.productModel.aggregate([
        { $match: { brandId: { $ne: null } } },
        {
          $group: {
            _id: '$brandId',
            productCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const brandIds = brandCounts.map((item) => item._id).filter(Boolean);
    const brands = await this.brandModel
      .find({ _id: { $in: brandIds }, isActive: true })
      .select('_id name logo')
      .lean();

    const brandById = brands.reduce<Record<string, any>>((acc, brand) => {
      acc[brand._id.toString()] = brand;
      return acc;
    }, {});

    const topBrands = brandCounts
      .map((item) => ({
        id: item._id.toString(),
        name: brandById[item._id.toString()]?.name,
        logo: brandById[item._id.toString()]?.logo,
        productCount: item.productCount,
      }))
      .filter((brand) => brand.name)
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 5);

    const revenueByBrand = await this.orderItemModel.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $match: {
          'product.brandId': { $ne: null },
        },
      },
      {
        $group: {
          _id: '$product.brandId',
          revenue: { $sum: { $multiply: ['$quantity', '$price'] } },
          productCount: { $addToSet: '$product._id' },
        },
      },
      {
        $project: {
          revenue: 1,
          productCount: { $size: '$productCount' },
        },
      },
    ]);

    const brandPerformance = revenueByBrand
      .map((item) => ({
        id: item._id.toString(),
        name: brandById[item._id.toString()]?.name,
        logo: brandById[item._id.toString()]?.logo,
        productCount: item.productCount,
        revenue: item.revenue,
      }))
      .filter((brand) => brand.name)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalBrands,
      activeBrands,
      topBrands,
      brandPerformance,
    };
  }

  // Get brands for dropdown (lightweight)
  async getBrandsList() {
    return this.brandModel
      .find({ isActive: true })
      .select('_id name slug')
      .sort({ name: 1 })
      .lean();
  }
}
