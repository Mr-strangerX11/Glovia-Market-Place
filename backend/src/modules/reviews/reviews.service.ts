import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateReviewDto } from './dto/reviews.dto';
import { Review } from '../../database/schemas/review.schema';
import { Product } from '../../database/schemas/product.schema';
import { OrderItem } from '../../database/schemas/order-item.schema';
import { Order, OrderStatus } from '../../database/schemas/order.schema';
import { User } from '../../database/schemas/user.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    if (!Types.ObjectId.isValid(dto.productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findById(dto.productId).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user has purchased this product
    const orderItems = await this.orderItemModel.find({
      productId: new Types.ObjectId(dto.productId)
    }).lean();

    const orderIds = orderItems.map(item => item.orderId);
    const hasPurchased = await this.orderModel.findOne({
      _id: { $in: orderIds },
      userId: new Types.ObjectId(userId),
      status: OrderStatus.DELIVERED
    }).lean();

    // Check for existing review
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId)
    }).lean();

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = new this.reviewModel({
      ...dto,
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId),
      isVerified: !!hasPurchased,
      isApproved: false
    });

    const savedReview = await review.save();

    // Get user details
    const user = await this.userModel.findById(userId).select('firstName lastName profileImage').lean();

    return {
      ...savedReview.toObject(),
      approved: savedReview.isApproved,
      user
    };
  }

  async findByProduct(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const reviews = await this.reviewModel.find({
      productId: new Types.ObjectId(productId),
      isApproved: true
    }).sort({ createdAt: -1 }).lean();

    // Get user details
    const userIds = [...new Set(reviews.map(r => r.userId.toString()))];
    const users = await this.userModel.find({
      _id: { $in: userIds }
    }).select('firstName lastName profileImage').lean();

    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    return reviews.map(review => ({
      ...review,
      approved: review.isApproved,
      user: userMap[review.userId.toString()] || null
    }));
  }
}
