import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../database/schemas/order.schema';
import { User, UserRole } from '../../database/schemas/user.schema';
import { Product } from '../../database/schemas/product.schema';
import { OrderItem } from '../../database/schemas/order-item.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
  ) {}

  async getOverview() {
    const [totalOrders, totalRevenue, totalCustomers, totalProducts] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.aggregate([{ $group: { _id: null, sum: { $sum: '$total' } } }]),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
      this.productModel.countDocuments(),
    ]);
    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.sum || 0,
      totalCustomers,
      totalProducts,
    };
  }

  async getSales(query: any) {
    // Example: sales by day for last 30 days
    const days = Number(query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sales = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return sales;
  }

  async getRevenue(query: any) {
    // Example: revenue by day for last 30 days
    const days = Number(query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const revenue = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sum: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
    ]);
    return revenue;
  }

  async getTopProducts(query: any) {
    const limit = Number(query.limit) || 5;
    const topProducts = await this.orderItemModel.aggregate([
      { $group: { _id: '$productId', totalSold: { $sum: '$quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);
    return topProducts;
  }

  async getTopCustomers(query: any) {
    const limit = Number(query.limit) || 5;
    const topCustomers = await this.orderModel.aggregate([
      { $group: { _id: '$userId', totalSpent: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
    ]);
    return topCustomers;
  }

  async getOrdersStats(query: any) {
    // Example: order status counts
    const stats = await this.orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return stats;
  }
}
