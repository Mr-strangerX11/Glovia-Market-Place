import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, Product, ProductImage, ProductCategory } from '../../database/schemas';
import { CategoriesGateway } from './categories.gateway';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel('Category') private categoryModel: Model<Category>,
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('ProductImage') private productImageModel: Model<ProductImage>,
    private categoriesGateway: CategoriesGateway,
  ) {}

  async findAll() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    const categoryIds = categories.map((category) => category._id);

    const [children, productCounts] = await Promise.all([
      this.categoryModel
        .find({
          parentId: { $in: categoryIds },
          isActive: true,
        })
        .sort({ displayOrder: 1 })
        .lean(),
      this.productModel
        .aggregate([
          {
            $match: {
              isActive: true,
              categoryId: { $in: categoryIds },
            },
          },
          {
            $group: {
              _id: '$categoryId',
              count: { $sum: 1 },
            },
          },
        ]),
    ]);

    const childrenByParentId = children.reduce<Record<string, any[]>>((acc, child) => {
      const key = child.parentId?.toString();
      if (!key) {
        return acc;
      }
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(child);
      return acc;
    }, {});

    const countsByCategoryId = productCounts.reduce<Record<string, number>>((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    return categories.map((category) => ({
      ...category,
      children: childrenByParentId[category._id.toString()] || [],
      _count: { products: countsByCategoryId[category._id.toString()] || 0 },
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel
      .findOne({ slug, isActive: true })
      .lean();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const [children, products] = await Promise.all([
      this.categoryModel
        .find({ parentId: new Types.ObjectId(category._id), isActive: true })
        .sort({ displayOrder: 1 })
        .lean(),
      this.productModel
        .find({ categoryId: new Types.ObjectId(category._id), isActive: true })
        .limit(12)
        .lean(),
    ]);

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

    const productsWithImages = products.map((product) => ({
      ...product,
      images: firstImageByProductId[product._id.toString()]
        ? [firstImageByProductId[product._id.toString()]]
        : [],
    }));

    return {
      ...category,
      children,
      products: productsWithImages,
    };
  }

  async findByParent(parentId: string) {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException('Invalid parent category id');
    }

    return this.categoryModel
      .find({ parentId: new Types.ObjectId(parentId), isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
  }

  async create(dto: any) {
    const payload = { ...dto };

    if (!payload.name || typeof payload.name !== 'string') {
      throw new BadRequestException('Category name is required');
    }

    const normalizedName = payload.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }
    payload.name = normalizedName;

    if (!payload.slug || typeof payload.slug !== 'string' || !payload.slug.trim()) {
      payload.slug = normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    } else {
      payload.slug = payload.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    let parentCategory: Category | null = null;

    if (payload.parentId) {
      if (!Types.ObjectId.isValid(payload.parentId)) {
        throw new BadRequestException('Invalid parentId');
      }

      parentCategory = await this.categoryModel.findById(payload.parentId);
      if (!parentCategory || !parentCategory.isActive) {
        throw new BadRequestException('Parent category not found');
      }
    }

    if (!payload.type && parentCategory?.type) {
      payload.type = parentCategory.type;
    }

    if (!payload.type) {
      payload.type = ProductCategory.SKINCARE;
    }

    const existingSlug = await this.categoryModel.findOne({ slug: payload.slug }).select('_id').lean();
    if (existingSlug) {
      const suffix = Date.now().toString().slice(-5);
      payload.slug = `${payload.slug}-${suffix}`;
    }

    const category = await this.categoryModel.create(payload);
    
    // Broadcast the creation event in real-time
    try {
      if (payload.parentId) {
        // Subcategory was created
        this.categoriesGateway.broadcastSubcategoryCreated(category, payload.parentId.toString());
      } else {
        // Main category was created
        this.categoriesGateway.broadcastCategoryUpdate(category);
      }
    } catch (error) {
      // Log but don't fail the creation if broadcasting fails
      console.error('Error broadcasting category update:', error);
    }
    
    return category;
  }

  async update(id: string, dto: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const payload = { ...dto };

    if (typeof payload.name === 'string') {
      payload.name = payload.name.trim();
      if (!payload.name) {
        throw new BadRequestException('Category name cannot be empty');
      }
    }

    if (typeof payload.slug === 'string') {
      payload.slug = payload.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!payload.slug) {
        throw new BadRequestException('Category slug cannot be empty');
      }
    }

    try {
      const category = await this.categoryModel.findByIdAndUpdate(id, payload, { new: true });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      
      // Broadcast the update event in real-time
      try {
        this.categoriesGateway.broadcastCategoryUpdate(category);
      } catch (error) {
        // Log but don't fail the update if broadcasting fails
        console.error('Error broadcasting category update:', error);
      }
      
      return category;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Category slug already exists');
      }
      if (error?.name === 'ValidationError' || error?.name === 'CastError') {
        throw new BadRequestException(error?.message || 'Invalid category data');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { message: 'Category deleted successfully' };
  }

  async seedInitialCategories() {
    const existingCount = await this.categoryModel.countDocuments();
    if (existingCount > 0) {
      return { message: 'Categories already exist', count: existingCount };
    }

    const mainCategories = [
      {
        name: 'Beauty',
        slug: 'beauty',
        description: 'Skincare, Makeup, Haircare and beauty products',
        type: ProductCategory.BEAUTY,
        displayOrder: 1,
        isMainCategory: true,
      },
      {
        name: 'Pharmacy',
        slug: 'pharmacy',
        description: 'Medications, Supplements and wellness products',
        type: ProductCategory.PHARMACY,
        displayOrder: 2,
        isMainCategory: true,
      },
      {
        name: 'Groceries',
        slug: 'groceries',
        description: 'Food, Beverages and pantry items',
        type: ProductCategory.GROCERIES,
        displayOrder: 3,
        isMainCategory: true,
      },
      {
        name: 'Clothes & Shoes',
        slug: 'clothes-shoes',
        description: 'Apparel, Footwear and fashion items',
        type: ProductCategory.CLOTHES_SHOES,
        displayOrder: 4,
        isMainCategory: true,
      },
      {
        name: 'Essentials',
        slug: 'essentials',
        description: 'Home, Kitchen and daily essentials',
        type: ProductCategory.ESSENTIALS,
        displayOrder: 5,
        isMainCategory: true,
      },
    ];

    const created = await this.categoryModel.insertMany(mainCategories);
    return { message: 'Main categories seeded successfully', count: created.length, categories: created };
  }

  async findMainCategories() {
    const mainCategories = await this.categoryModel
      .find({ isMainCategory: true, isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    const categoryIds = mainCategories.map((category) => category._id);

    const children = await this.categoryModel
      .find({
        parentId: { $in: categoryIds },
        isActive: true,
      })
      .sort({ displayOrder: 1 })
      .lean();

    const childrenByParentId = children.reduce<Record<string, any[]>>((acc, child) => {
      const key = child.parentId?.toString();
      if (!key) {
        return acc;
      }
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(child);
      return acc;
    }, {});

    return mainCategories.map((category) => ({
      ...category,
      children: childrenByParentId[category._id.toString()] || [],
    }));
  }
}
