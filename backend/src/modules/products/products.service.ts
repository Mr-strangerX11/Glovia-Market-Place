import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductImage,
  Category,
  Brand,
  Review,
  SkinType,
  ProductVariant,
} from '../../database/schemas';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('ProductImage') private productImageModel: Model<ProductImage>,
    @InjectModel('Category') private categoryModel: Model<Category>,
    @InjectModel('Brand') private brandModel: Model<Brand>,
    @InjectModel('Review') private reviewModel: Model<Review>,
    @InjectModel('ProductVariant') private productVariantModel: Model<ProductVariant>,
  ) {}
  // Product Variant Methods
  async getVariants(productId: string) {
    return this.productVariantModel.find({ productId }).lean();
  }

  async createVariant(productId: string, dto: any, user: any) {
    // Optionally, add audit log here
    return this.productVariantModel.create({ ...dto, productId });
  }

  async updateVariant(productId: string, variantId: string, dto: any, user: any) {
    // Optionally, add audit log here
    const variant = await this.productVariantModel.findOneAndUpdate(
      { _id: variantId, productId },
      dto,
      { new: true }
    );
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  async deleteVariant(productId: string, variantId: string, user: any) {
    // Optionally, add audit log here
    const variant = await this.productVariantModel.findOneAndDelete({ _id: variantId, productId });
    if (!variant) throw new NotFoundException('Variant not found');
    return { message: 'Variant deleted successfully' };
  }

  async findAll(filters?: {
    search?: string;
    categoryId?: string;
    category?: string;
    brandId?: string;
    brand?: string;
    skinType?: SkinType;
    minPrice?: number;
    maxPrice?: number;
    isFeatured?: boolean;
    isBestSeller?: boolean;
    isNew?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      categoryId,
      category,
      brandId,
      brand,
      skinType,
      minPrice,
      maxPrice,
      isFeatured,
      isBestSeller,
      isNew,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters || {};

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      where.$or = [
        { name: regex },
        { description: regex },
        { tags: search },
      ];
    }

    let resolvedCategoryId: Types.ObjectId | undefined;
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      resolvedCategoryId = new Types.ObjectId(categoryId);
    } else if (category) {
      const categoryRecord = await this.categoryModel
        .findOne({ slug: category, isActive: true })
        .select('_id')
        .lean();
      if (categoryRecord?._id) {
        resolvedCategoryId = new Types.ObjectId(categoryRecord._id);
      }
    }

    if (resolvedCategoryId) {
      where.categoryId = resolvedCategoryId;
    }

    let resolvedBrandId: Types.ObjectId | undefined;
    if (brandId && Types.ObjectId.isValid(brandId)) {
      resolvedBrandId = new Types.ObjectId(brandId);
    } else if (brand) {
      const brandRecord = await this.brandModel
        .findOne({ slug: brand })
        .select('_id')
        .lean();
      if (brandRecord?._id) {
        resolvedBrandId = new Types.ObjectId(brandRecord._id);
      }
    }

    if (resolvedBrandId) {
      where.brandId = resolvedBrandId;
    }

    if (skinType) {
      where.suitableFor = skinType;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (minPrice !== undefined) {
        priceFilter.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceFilter.$lte = maxPrice;
      }
      where.price = priceFilter;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (isBestSeller !== undefined) {
      where.isBestSeller = isBestSeller;
    }

    if (isNew !== undefined) {
      where.isNewProduct = isNew;
    }

    const skip = (page - 1) * limit;
    const sortValue = sortOrder === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      this.productModel
        .find(where)
        .sort({ [sortBy]: sortValue })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(where),
    ]);

    const productIds = products.map((product) => product._id);

    const [images, categories, brands, reviewStats] = await Promise.all([
      this.productImageModel
        .find({ productId: { $in: productIds } })
        .sort({ displayOrder: 1 })
        .lean(),
      this.categoryModel
        .find({ _id: { $in: products.map((p) => p.categoryId) } })
        .select('_id name slug')
        .lean(),
      this.brandModel
        .find({ _id: { $in: products.map((p) => p.brandId).filter(Boolean) } })
        .select('_id name slug')
        .lean(),
      this.reviewModel
        .aggregate([
          {
            $match: {
              productId: { $in: productIds },
            },
          },
          {
            $group: {
              _id: '$productId',
              averageRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
        ]),
    ]);

    const firstImageByProductId = images.reduce<Record<string, any>>((acc, image) => {
      const key = image.productId.toString();
      if (!acc[key]) {
        acc[key] = image;
      }
      return acc;
    }, {});

    const categoryById = categories.reduce<Record<string, any>>((acc, category) => {
      acc[category._id.toString()] = category;
      return acc;
    }, {});

    const brandById = brands.reduce<Record<string, any>>((acc, brand) => {
      acc[brand._id.toString()] = brand;
      return acc;
    }, {});

    const reviewStatsByProductId = reviewStats.reduce<Record<string, any>>((acc, stat) => {
      acc[stat._id.toString()] = stat;
      return acc;
    }, {});

    const productsWithRatings = products.map((product) => {
      const stats = reviewStatsByProductId[product._id.toString()];
      const averageRating = stats ? Number(stats.averageRating.toFixed(1)) : 0;
      const reviewCount = stats ? stats.reviewCount : 0;

      return {
        ...product,
        images: firstImageByProductId[product._id.toString()] ? [firstImageByProductId[product._id.toString()]] : [],
        category: categoryById[product.categoryId?.toString()],
        brand: product.brandId ? brandById[product.brandId.toString()] : null,
        averageRating,
        reviewCount,
      };
    });

    return {
      data: productsWithRatings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, isActive: true })
      .lean();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [images, category, brand, reviews] = await Promise.all([
      this.productImageModel
        .find({ productId: product._id })
        .sort({ displayOrder: 1 })
        .lean(),
      this.categoryModel
        .findById(product.categoryId)
        .select('_id name slug')
        .lean(),
      product.brandId
        ? this.brandModel
            .findById(product.brandId)
            .select('_id name slug logo')
            .lean()
        : null,
      this.reviewModel
        .find({ productId: product._id, isApproved: true })
        .sort({ createdAt: -1 })
        .populate({
          path: 'userId',
          model: 'User',
          select: 'firstName lastName profileImage',
        })
        .lean(),
    ]);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;

    return {
      ...product,
      images,
      category,
      brand,
      reviews: reviews.map((review) => ({
        ...review,
        user: review.userId,
      })),
      averageRating: Number(avgRating.toFixed(1)),
      reviewCount: reviews.length,
    };
  }

  async getFeaturedProducts(limit = 8) {
    const products = await this.productModel
      .find({ isActive: true, isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const productIds = products.map((product) => product._id);
    const [images, categories] = await Promise.all([
      this.productImageModel
        .find({ productId: { $in: productIds } })
        .sort({ displayOrder: 1 })
        .lean(),
      this.categoryModel
        .find({ _id: { $in: products.map((p) => p.categoryId) } })
        .select('_id name')
        .lean(),
    ]);

    const firstImageByProductId = images.reduce<Record<string, any>>((acc, image) => {
      const key = image.productId.toString();
      if (!acc[key]) {
        acc[key] = image;
      }
      return acc;
    }, {});

    const categoryById = categories.reduce<Record<string, any>>((acc, category) => {
      acc[category._id.toString()] = category;
      return acc;
    }, {});

    return products.map((product) => ({
      ...product,
      images: firstImageByProductId[product._id.toString()] ? [firstImageByProductId[product._id.toString()]] : [],
      category: categoryById[product.categoryId?.toString()],
    }));
  }

  async getBestSellers(limit = 8) {
    const products = await this.productModel
      .find({ isActive: true, isBestSeller: true })
      .limit(limit)
      .lean();

    const productIds = products.map((product) => product._id);
    const images = await this.productImageModel
      .find({ productId: { $in: productIds } })
      .sort({ displayOrder: 1 })
      .lean();

    const firstImageByProductId = images.reduce<Record<string, any>>((acc, image) => {
      const key = image.productId.toString();
      if (!acc[key]) {
        acc[key] = image;
      }
      return acc;
    }, {});

    return products.map((product) => ({
      ...product,
      images: firstImageByProductId[product._id.toString()] ? [firstImageByProductId[product._id.toString()]] : [],
    }));
  }

  async getRelatedProducts(productId: string, categoryId: string, limit = 4) {
    const products = await this.productModel
      .find({
        _id: { $ne: new Types.ObjectId(productId) },
        categoryId: new Types.ObjectId(categoryId),
        isActive: true,
      })
      .limit(limit)
      .lean();

    const productIds = products.map((product) => product._id);
    const images = await this.productImageModel
      .find({ productId: { $in: productIds } })
      .sort({ displayOrder: 1 })
      .lean();

    const firstImageByProductId = images.reduce<Record<string, any>>((acc, image) => {
      const key = image.productId.toString();
      if (!acc[key]) {
        acc[key] = image;
      }
      return acc;
    }, {});

    return products.map((product) => ({
      ...product,
      images: firstImageByProductId[product._id.toString()] ? [firstImageByProductId[product._id.toString()]] : [],
    }));
  }
}
