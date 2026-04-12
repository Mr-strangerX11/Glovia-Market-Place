import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WishlistItem } from '../../database/schemas/wishlist-item.schema';
import { Product } from '../../database/schemas/product.schema';
import { ProductImage } from '../../database/schemas/product-image.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name) private wishlistModel: Model<WishlistItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(ProductImage.name) private productImageModel: Model<ProductImage>,
  ) {}

  async getWishlist(userId: string) {
    const wishlistItems = await this.wishlistModel.find({
      userId: new Types.ObjectId(userId)
    }).lean();

    // Get product details and images
    const productIds = wishlistItems.map(w => w.productId);
    const [products, images] = await Promise.all([
      this.productModel.find({ _id: { $in: productIds } }).lean(),
      this.productImageModel.find({ productId: { $in: productIds } }).lean()
    ]);

    const productMap = products.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {} as Record<string, any>);

    const imagesByProduct = images.reduce((acc, img) => {
      const key = img.productId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    }, {} as Record<string, any[]>);

    return wishlistItems.map(item => ({
      ...item,
      product: {
        ...productMap[item.productId.toString()],
        images: imagesByProduct[item.productId.toString()] || []
      }
    }));
  }

  async addToWishlist(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException('Invalid product ID');
    }

    const product = await this.productModel.findById(productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const userObjId = new Types.ObjectId(userId);
    const productObjId = new Types.ObjectId(productId);

    const existing = await this.wishlistModel.findOne({
      userId: userObjId,
      productId: productObjId
    }).lean();

    if (existing) {
      return existing;
    }

    const wishlistItem = new this.wishlistModel({
      userId: userObjId,
      productId: productObjId,
    });

    return wishlistItem.save();
  }

  async removeFromWishlist(userId: string, itemId: string) {
    if (!Types.ObjectId.isValid(itemId)) {
      throw new NotFoundException('Invalid item ID');
    }

    const item = await this.wishlistModel.findOne({
      _id: new Types.ObjectId(itemId),
      userId: new Types.ObjectId(userId)
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.wishlistModel.deleteOne({ _id: new Types.ObjectId(itemId) });
    return { message: 'Item removed from wishlist' };
  }
}
