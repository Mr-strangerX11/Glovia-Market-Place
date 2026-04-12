import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { ProductImage } from '../../database/schemas/product-image.schema';

// Type for lean() results (plain JS object, not a Mongoose document)
type ProductLean = Omit<Product, keyof Document> & {
  _id: string | Types.ObjectId;
  categoryId: string | Types.ObjectId;
  isActive: boolean;
  isBestSeller?: boolean;
};

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductImage.name) private productImageModel: Model<Document & ProductImage>,
  ) {}

  async getRecommendations(userId?: string, productId?: string) {
    let products: Array<ProductLean> = [];

    // If productId is provided, get similar products
    if (productId && Types.ObjectId.isValid(productId)) {
      const product = await this.productModel.findById(productId).lean<ProductLean | null>();
      if (product) {
        // Get products in the same category, excluding the current product
        products = await this.productModel
          .find({
            categoryId: product.categoryId,
            _id: { $ne: product._id },
            isActive: true,
          })
          .limit(6)
          .lean<Array<ProductLean>>();
        
        if (products.length === 0) {
          // Fallback: get popular products if category has no similar items
          products = await this.productModel
            .find({ isActive: true, isBestSeller: true })
            .limit(6)
            .lean<Array<ProductLean>>();
        }
      }
    }

    // If no products found yet: get popular/best seller products
    if (products.length === 0) {
      products = await this.productModel
        .find({ isActive: true, isBestSeller: true })
        .limit(6)
        .lean<Array<ProductLean>>();
    }

    // If still no products: get any active products
    if (products.length === 0) {
      products = await this.productModel
        .find({ isActive: true })
        .limit(6)
        .lean<Array<ProductLean>>();
    }

    // Fetch images for all products
    if (products.length > 0) {
      const productIds = products.map(p => p._id);
      const images = await this.productImageModel
        .find({ productId: { $in: productIds } })
        .sort({ displayOrder: 1 })
        .lean();

      // Create a map of productId -> first image
      const imageMap = new Map<string, any>();
      images.forEach(img => {
        const key = img.productId.toString();
        if (!imageMap.has(key)) {
          imageMap.set(key, img);
        }
      });

      // Attach images to products
      products = products.map(product => ({
        ...product,
        images: imageMap.has(product._id.toString()) 
          ? [imageMap.get(product._id.toString())] 
          : [],
      }));
    }

    return products;
  }
}

