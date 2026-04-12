import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CartItem } from '../../database/schemas/cart-item.schema';
import { Product } from '../../database/schemas/product.schema';
import { ProductImage } from '../../database/schemas/product-image.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(CartItem.name) private cartItemModel: Model<CartItem>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(ProductImage.name) private productImageModel: Model<ProductImage>,
  ) {}

  async getCart(userId: string) {
    const items = await this.cartItemModel.find({
      userId: new Types.ObjectId(userId)
    }).lean();

    // Get product details and images
    const productIds = items.map(i => i.productId);
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

    const itemsWithProducts = items.map(item => ({
      ...item,
      product: {
        ...productMap[item.productId.toString()],
        images: imagesByProduct[item.productId.toString()]?.slice(0, 1) || []
      }
    }));

    const total = itemsWithProducts.reduce(
      (sum, item) => sum + Number(item.product?.price || 0) * item.quantity,
      0,
    );

    return {
      items: itemsWithProducts,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addItem(userId: string, productId: string, quantity: number = 1) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException('Invalid product ID');
    }

    const product = await this.productModel.findById(productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const userObjId = new Types.ObjectId(userId);
    const productObjId = new Types.ObjectId(productId);

    const existingItem = await this.cartItemModel.findOne({
      userId: userObjId,
      productId: productObjId
    });

    if (existingItem) {
      return this.cartItemModel.findByIdAndUpdate(
        existingItem._id,
        { quantity: existingItem.quantity + quantity },
        { new: true }
      ).lean();
    }

    const newItem = new this.cartItemModel({
      userId: userObjId,
      productId: productObjId,
      quantity,
    });

    return newItem.save();
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    if (!Types.ObjectId.isValid(itemId)) {
      throw new NotFoundException('Invalid item ID');
    }

    const item = await this.cartItemModel.findOne({
      _id: new Types.ObjectId(itemId),
      userId: new Types.ObjectId(userId)
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.cartItemModel.findByIdAndUpdate(
      itemId,
      { quantity },
      { new: true }
    ).lean();
  }

  async removeItem(userId: string, itemId: string) {
    if (!Types.ObjectId.isValid(itemId)) {
      throw new NotFoundException('Invalid item ID');
    }

    const item = await this.cartItemModel.findOne({
      _id: new Types.ObjectId(itemId),
      userId: new Types.ObjectId(userId)
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemModel.deleteOne({ _id: new Types.ObjectId(itemId) });
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    await this.cartItemModel.deleteMany({
      userId: new Types.ObjectId(userId)
    });

    return { message: 'Cart cleared' };
  }
}
