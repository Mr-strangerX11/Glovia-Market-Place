import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from '../../database/schemas/banner.schema';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    private realtimeService: RealtimeService,
  ) {}

  async findAll() {
    return this.bannerModel.find({
      isActive: true,
    }).sort({ displayOrder: 1 }).lean();
  }

  async findAllForAdmin() {
    return this.bannerModel.find().sort({ displayOrder: 1 }).lean();
  }

  async findOne(id: string) {
    const banner = await this.bannerModel.findById(id).lean();
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async create(createBannerDto: any) {
    const banner = new this.bannerModel(createBannerDto);
    const savedBanner = await banner.save();
    
    // Emit real-time event
    this.realtimeService.emitBannerCreated({
      id: savedBanner._id,
      ...savedBanner.toObject(),
    });

    return savedBanner;
  }

  async update(id: string, updateBannerDto: any) {
    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      updateBannerDto,
      { new: true }
    );
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    // Emit real-time event
    this.realtimeService.emitBannerUpdate({
      id: banner._id,
      ...banner.toObject(),
    });

    return banner;
  }

  async remove(id: string) {
    const banner = await this.bannerModel.findByIdAndDelete(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    // Emit real-time event
    this.realtimeService.emitBannerDeleted(id);

    return { message: 'Banner deleted successfully' };
  }
}
