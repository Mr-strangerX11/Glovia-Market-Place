import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FlashDeal } from '../../database/schemas';
import { CreateFlashDealDto, UpdateFlashDealDto } from './dto/flash-deal.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class FlashDealsService {
  constructor(
    @InjectModel('FlashDeal') private flashDealModel: Model<FlashDeal>,
    private realtimeService: RealtimeService,
  ) {}

  // Public: Get active flash deals
  async getActiveFlashDeals() {
    const now = new Date();
    const deals = await this.flashDealModel
      .find({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
      })
      .sort({ displayOrder: 1 })
      .lean();

    return deals;
  }

  // Public: Get all flash deals (paginated)
  async getAllFlashDeals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [deals, total] = await Promise.all([
      this.flashDealModel
        .find()
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.flashDealModel.countDocuments(),
    ]);

    return {
      data: deals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Public: Get single flash deal by ID
  async getFlashDealById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const deal = await this.flashDealModel.findById(id).lean();
    if (!deal) {
      throw new NotFoundException('Flash deal not found');
    }

    return deal;
  }

  // Admin: Create flash deal
  async createFlashDeal(dto: CreateFlashDealDto, adminId: string) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (!dto.products || dto.products.length === 0) {
      throw new BadRequestException('At least one product is required');
    }

    // Validate all products
    const productsWithDiscount = dto.products.map((product) => {
      if (product.salePrice >= product.originalPrice) {
        throw new BadRequestException('Sale price must be less than original price');
      }

      const discountPercentage = Math.round(
        ((product.originalPrice - product.salePrice) / product.originalPrice) * 100
      );

      return {
        ...product,
        discountPercentage,
      };
    });

    const newDeal = new this.flashDealModel({
      title: dto.title,
      description: dto.description,
      products: productsWithDiscount,
      startTime: dto.startTime,
      endTime: dto.endTime,
      adImage: dto.adImage,
      displayOrder: dto.displayOrder || 0,
      createdBy: new Types.ObjectId(adminId),
    });

    const savedDeal = await newDeal.save();

    // Emit real-time event
    this.realtimeService.emitFlashDealCreated({
      id: savedDeal._id,
      ...savedDeal.toObject(),
    });

    return savedDeal;
  }

  // Admin: Update flash deal
  async updateFlashDeal(id: string, dto: UpdateFlashDealDto, adminId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const updateData: any = {
      updatedBy: new Types.ObjectId(adminId),
    };

    // Only include fields that are provided
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.adImage !== undefined) updateData.adImage = dto.adImage;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Handle products update with discount calculation
    if (dto.products !== undefined) {
      if (dto.products.length === 0) {
        throw new BadRequestException('At least one product is required');
      }

      const productsWithDiscount = dto.products.map((product) => {
        if (product.salePrice >= product.originalPrice) {
          throw new BadRequestException('Sale price must be less than original price');
        }

        const discountPercentage = Math.round(
          ((product.originalPrice - product.salePrice) / product.originalPrice) * 100
        );

        return {
          ...product,
          discountPercentage,
        };
      });

      updateData.products = productsWithDiscount;
    }

    const deal = await this.flashDealModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!deal) {
      throw new NotFoundException('Flash deal not found');
    }

    // Emit real-time event
    this.realtimeService.emitFlashDealUpdate({
      id: deal._id,
      ...deal.toObject(),
    });

    return deal;
  }

  // Admin: Delete flash deal
  async deleteFlashDeal(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const deal = await this.flashDealModel.findByIdAndDelete(id);
    if (!deal) {
      throw new NotFoundException('Flash deal not found');
    }

    // Emit real-time event
    this.realtimeService.emitFlashDealDeleted(id);

    return { message: 'Flash deal deleted successfully' };
  }

  // Admin: Bulk update displayOrder
  async reorderFlashDeals(deals: Array<{ id: string; order: number }>) {
    for (const deal of deals) {
      if (!Types.ObjectId.isValid(deal.id)) {
        throw new BadRequestException('Invalid flash deal ID');
      }
      await this.flashDealModel.findByIdAndUpdate(deal.id, {
        displayOrder: deal.order,
      });
    }

    return { message: 'Flash deals reordered successfully' };
  }

  // Admin: Toggle flash deal active status
  async toggleFlashDeal(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const deal = await this.flashDealModel.findById(id);
    if (!deal) {
      throw new NotFoundException('Flash deal not found');
    }

    deal.isActive = !deal.isActive;
    return await deal.save();
  }

  // Public: Record view
  async recordView(id: string) {
    if (!Types.ObjectId.isValid(id)) return;
    await this.flashDealModel.findByIdAndUpdate(id, {
      $inc: { views: 1 },
    });
  }

  // Public: Record click
  async recordClick(id: string) {
    if (!Types.ObjectId.isValid(id)) return;
    await this.flashDealModel.findByIdAndUpdate(id, {
      $inc: { clicks: 1 },
    });
  }

  // Admin: Get statistics
  async getStatistics() {
    const now = new Date();
    const [active, upcoming, expired, total] = await Promise.all([
      this.flashDealModel.countDocuments({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
      }),
      this.flashDealModel.countDocuments({
        startTime: { $gt: now },
      }),
      this.flashDealModel.countDocuments({
        endTime: { $lt: now },
      }),
      this.flashDealModel.countDocuments(),
    ]);

    const totalViews = await this.flashDealModel.aggregate([
      { $group: { _id: null, views: { $sum: '$views' } } },
    ]);

    const totalClicks = await this.flashDealModel.aggregate([
      { $group: { _id: null, clicks: { $sum: '$clicks' } } },
    ]);

    return {
      active,
      upcoming,
      expired,
      total,
      totalViews: totalViews[0]?.views || 0,
      totalClicks: totalClicks[0]?.clicks || 0,
    };
  }
}
