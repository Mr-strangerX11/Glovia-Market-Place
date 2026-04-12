import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon } from '../../database/schemas/coupon.schema';

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>
  ) {}

  async create(dto: any) {
    const payload = this.mapCouponPayload(dto);
    return this.couponModel.create(payload);
  }

  async findAll() {
    const now = new Date();
    return this.couponModel
      .find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findAllForAdmin() {
    return this.couponModel.find().sort({ createdAt: -1 }).lean();
  }

  async findByCode(code: string) {
    const normalizedCode = (code || '').trim().toUpperCase();
    const promo = await this.couponModel.findOne({ code: normalizedCode, isActive: true }).lean();
    if (!promo) throw new NotFoundException('Promo code not found');

    const now = new Date();
    if (promo.validFrom && now < new Date(promo.validFrom)) {
      throw new BadRequestException('Promo code is not active yet');
    }
    if (promo.validUntil && now > new Date(promo.validUntil)) {
      throw new BadRequestException('Promo code has expired');
    }

    return promo;
  }

  async update(id: string, dto: any) {
    const payload = this.mapCouponPayload(dto, true);
    return this.couponModel.findByIdAndUpdate(id, payload, { new: true });
  }

  async remove(id: string) {
    return this.couponModel.findByIdAndDelete(id);
  }

  private mapCouponPayload(dto: any, isPartial = false) {
    const payload: any = {};

    if (!isPartial || dto.code !== undefined) {
      payload.code = String(dto.code || '').trim().toUpperCase();
    }

    if (!isPartial || dto.description !== undefined) {
      payload.description = dto.description || undefined;
    }

    const discountType = dto.discountType || (dto.discountPercentage !== undefined ? 'PERCENTAGE' : undefined);
    if (!isPartial || discountType !== undefined) {
      payload.discountType = discountType;
    }

    const discountValue = dto.discountValue ?? dto.discountPercentage;
    if (!isPartial || discountValue !== undefined) {
      payload.discountValue = this.toNumber(discountValue, 'discountValue');
    }

    if (!isPartial || dto.minOrderAmount !== undefined) {
      payload.minOrderAmount = dto.minOrderAmount !== undefined
        ? this.toNumber(dto.minOrderAmount, 'minOrderAmount')
        : undefined;
    }

    if (!isPartial || dto.maxDiscount !== undefined) {
      payload.maxDiscount = dto.maxDiscount !== undefined
        ? this.toNumber(dto.maxDiscount, 'maxDiscount')
        : undefined;
    }

    if (!isPartial || dto.usageLimit !== undefined) {
      payload.usageLimit = dto.usageLimit !== undefined
        ? this.toNumber(dto.usageLimit, 'usageLimit')
        : undefined;
    }

    if (!isPartial || dto.isActive !== undefined) {
      payload.isActive = dto.isActive !== undefined ? Boolean(dto.isActive) : true;
    }

    const validFrom = dto.validFrom;
    const validUntil = dto.validUntil ?? dto.expiresAt;

    if (!isPartial || validFrom !== undefined) {
      payload.validFrom = validFrom ? this.toDate(validFrom, 'validFrom') : new Date();
    }

    if (!isPartial || validUntil !== undefined) {
      payload.validUntil = validUntil
        ? this.toDate(validUntil, 'validUntil')
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (payload.validFrom && payload.validUntil && payload.validFrom > payload.validUntil) {
      throw new BadRequestException('validUntil must be greater than validFrom');
    }

    return payload;
  }

  private toNumber(value: any, field: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
    if (parsed < 0) {
      throw new BadRequestException(`${field} cannot be negative`);
    }
    return parsed;
  }

  private toDate(value: any, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return parsed;
  }
}
