import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './dto/users.dto';
import { AddAddressWithGeoDto } from './dto/add-address-geo.dto';
import { User, Address, Order } from '../../database/schemas';
import { OtpVerification } from '../../database/schemas/otp-verification.schema';
import { OtpService, EmailOtpService } from '../verification/otp.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Address') private addressModel: Model<Address>,
    @InjectModel('Order') private orderModel: Model<Order>,
    @InjectModel('OtpVerification') private otpVerificationModel: Model<OtpVerification>,
    private otpService: OtpService,
    private emailOtpService: EmailOtpService,
  ) {}

  async updateUserPermissions(userId: string, permissions: Record<string, boolean>) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { permissions },
      { new: true }
    ).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('id email phone firstName lastName role skinType profileImage vendorType vendorDescription vendorLogo isEmailVerified isPhoneVerified createdAt')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload: any = {};

    if (dto.firstName !== undefined) {
      payload.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      payload.lastName = dto.lastName.trim();
    }

    if (dto.skinType !== undefined) {
      payload.skinType = dto.skinType;
    }

    if (dto.profileImage !== undefined) {
      payload.profileImage = dto.profileImage?.trim() || '';
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();

      if (normalizedEmail !== (user.email || '').toLowerCase()) {
        const verifiedEmailChange = await this.otpVerificationModel
          .findOne({
            userId: new Types.ObjectId(userId),
            phone: normalizedEmail,
            purpose: 'email_change',
            isVerified: true,
          })
          .sort({ updatedAt: -1 })
          .lean();

        if (!verifiedEmailChange) {
          throw new BadRequestException('Please verify your new email with OTP before saving');
        }
      }

      const duplicateEmail = await this.userModel
        .findOne({ email: normalizedEmail, _id: { $ne: userId } })
        .select('_id')
        .lean();

      if (duplicateEmail) {
        throw new BadRequestException('Email is already in use');
      }

      payload.email = normalizedEmail;
    }

    if (dto.phone !== undefined) {
      const normalizedPhone = dto.phone.trim();
      if (!normalizedPhone) {
        payload.phone = undefined;
      } else {
        const duplicatePhone = await this.userModel
          .findOne({ phone: normalizedPhone, _id: { $ne: userId } })
          .select('_id')
          .lean();

        if (duplicatePhone) {
          throw new BadRequestException('Phone number is already in use');
        }

        payload.phone = normalizedPhone;
      }
    }

    if (dto.vendorType !== undefined) {
      payload.vendorType = dto.vendorType;
    }

    if (dto.vendorDescription !== undefined) {
      payload.vendorDescription = dto.vendorDescription?.trim() || '';
    }

    if (dto.vendorLogo !== undefined) {
      payload.vendorLogo = dto.vendorLogo?.trim() || '';
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, payload, { new: true })
      .select('id email phone firstName lastName skinType profileImage vendorType vendorDescription vendorLogo')
      .lean();

    if (payload.email && payload.email !== (user.email || '').toLowerCase()) {
      await this.otpVerificationModel.deleteMany({
        userId: new Types.ObjectId(userId),
        phone: payload.email,
        purpose: 'email_change',
      });
    }

    return updatedUser;
  }

  async sendEmailChangeOtp(userId: string, email: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    if (normalizedEmail === (user.email || '').toLowerCase()) {
      throw new BadRequestException('Please enter a different email');
    }

    const duplicateEmail = await this.userModel
      .findOne({ email: normalizedEmail, _id: { $ne: userId } })
      .select('_id')
      .lean();

    if (duplicateEmail) {
      throw new BadRequestException('Email is already in use');
    }

    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await this.otpVerificationModel.create({
      userId: new Types.ObjectId(userId),
      phone: normalizedEmail,
      otp,
      purpose: 'email_change',
      expiresAt,
    });

    const sent = await this.emailOtpService.sendEmailOtp(normalizedEmail, otp, 'email_verification');
    if (!sent) {
      throw new BadRequestException('Failed to send verification code to new email');
    }

    return {
      success: true,
      message: 'Verification code sent to your new email',
    };
  }

  async verifyEmailChangeOtp(userId: string, email: string, otp: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const otpRecord = await this.otpVerificationModel
      .findOne({
        userId: new Types.ObjectId(userId),
        phone: normalizedEmail,
        otp,
        purpose: 'email_change',
        isVerified: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord) {
      const anyOtpRecord = await this.otpVerificationModel
        .findOne({
          userId: new Types.ObjectId(userId),
          phone: normalizedEmail,
          purpose: 'email_change',
          isVerified: false,
          expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1 })
        .lean();

      if (anyOtpRecord) {
        await this.otpVerificationModel.findByIdAndUpdate(anyOtpRecord._id, { $inc: { attempts: 1 } }, { new: true });
        throw new BadRequestException('Wrong code. Please check your email and try again.');
      }

      throw new BadRequestException('Verification code expired. Please request a new code.');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new code.');
    }

    await this.otpVerificationModel.findByIdAndUpdate(
      otpRecord._id,
      { $set: { isVerified: true }, $inc: { attempts: 1 } },
      { new: true },
    );

    return {
      success: true,
      message: 'New email verified successfully. You can now save profile changes.',
      email: normalizedEmail,
    };
  }

  async getAddresses(userId: string) {
    return this.addressModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const addressCount = await this.addressModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const shouldSetDefault = dto.isDefault || addressCount === 0;

    if (shouldSetDefault) {
      await this.addressModel.updateMany(
        { userId: new Types.ObjectId(userId) },
        { isDefault: false }
      );
    }

    return this.addressModel.create({
      ...dto,
      isDefault: shouldSetDefault,
      userId: new Types.ObjectId(userId),
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.addressModel.findOne({
      _id: new Types.ObjectId(addressId),
      userId: new Types.ObjectId(userId),
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const makeDefault = dto.isDefault === true;

    if (makeDefault) {
      await this.addressModel.updateMany(
        { userId: new Types.ObjectId(userId), _id: { $ne: new Types.ObjectId(addressId) } },
        { isDefault: false }
      );
    }

    const updated = await this.addressModel
      .findByIdAndUpdate(
        addressId,
        {
          ...dto,
          isDefault: makeDefault ? true : dto.isDefault,
        },
        { new: true }
      )
      .lean();

    const defaultExists = await this.addressModel.findOne({
      userId: new Types.ObjectId(userId),
      isDefault: true,
    });

    if (!defaultExists) {
      await this.addressModel.findByIdAndUpdate(updated._id, { isDefault: true });
      return { ...updated, isDefault: true };
    }

    return updated;
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.addressModel.findOne({
      _id: new Types.ObjectId(addressId),
      userId: new Types.ObjectId(userId),
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.addressModel.findByIdAndDelete(addressId);

    return { message: 'Address deleted successfully' };
  }

  async createAddressWithGeo(userId: string, dto: AddAddressWithGeoDto) {
    const addressCount = await this.addressModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const isFirstAddress = addressCount === 0;

    // Auto-verify if coordinates provided
    const isVerified = !!(dto.latitude && dto.longitude);

    const address = await this.addressModel.create({
      userId: new Types.ObjectId(userId),
      fullName: dto.fullName,
      phone: dto.phone,
      province: dto.province,
      district: dto.district,
      municipality: dto.municipality,
      wardNo: dto.wardNo,
      area: dto.area,
      landmark: dto.landmark,
      latitude: dto.latitude ? Number(dto.latitude) : null,
      longitude: dto.longitude ? Number(dto.longitude) : null,
      isVerified,
      isDefault: isFirstAddress,
    });

    // Boost trust score if geo-verified
    if (isVerified) {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { trustScore: 20 },
      });
    }

    return address;
  }

  async getOrderHistory(userId: string) {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items',
        populate: {
          path: 'productId',
          select: 'id name slug',
        },
      })
      .populate('addressId')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getVendorStatus(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('id email role isFrozen frozenAt frozenReason vendorType vendorDescription')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async isVendorFrozen(userId: string): Promise<boolean> {
    const user = await this.userModel
      .findById(userId)
      .select('isFrozen')
      .lean();

    return user?.isFrozen || false;
  }
}
