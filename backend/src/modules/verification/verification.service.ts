import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, Address, Order, OtpVerification } from '../../database/schemas';
import { OtpService } from './otp.service';
import { SendOtpDto, OtpPurpose } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Address') private addressModel: Model<Address>,
    @InjectModel('Order') private orderModel: Model<Order>,
    @InjectModel('OtpVerification') private otpModel: Model<OtpVerification>,
    private otpService: OtpService,
  ) {}

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    // TODO: Implement email service integration
    // For now, just mark as placeholder
    console.log(`[Email Verification] Sending to ${email} for user ${userId}`);
  }

  /**
   * Verify email using token
   */
  async verifyEmail(userId: string): Promise<{ message: string; trustScore: number }> {
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified', trustScore: user.trustScore };
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          isEmailVerified: true,
          $inc: { trustScore: 20 },
        },
        { new: true }
      )
      .lean();

    return {
      message: 'Email verified successfully',
      trustScore: updatedUser.trustScore,
    };
  }

  /**
   * Send OTP to phone
   */
  async sendOtp(dto: SendOtpDto, userId?: string): Promise<{ message: string }> {
    const { phone, purpose } = dto;

    // Find user by phone
    const user = await this.userModel.findOne({ phone }).lean();

    if (!user && !userId) {
      throw new NotFoundException('User not found');
    }

    const targetUserId = userId || user._id.toString();

    // Check for existing pending OTP
    const existingOtp = await this.otpModel
      .findOne({
        userId: new Types.ObjectId(targetUserId),
        phone,
        purpose,
        expiresAt: { $gt: new Date() },
        isVerified: false,
      })
      .sort({ createdAt: -1 })
      .lean();

    // Rate limiting: max 1 OTP per minute
    if (existingOtp) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (existingOtp.createdAt > oneMinuteAgo) {
        throw new BadRequestException('Please wait before requesting another OTP');
      }
    }

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP
    await this.otpModel.create({
      userId: new Types.ObjectId(targetUserId),
      phone,
      otp,
      purpose,
      expiresAt,
    });

    // Send OTP
    const sent = await this.otpService.sendOtp(phone, otp, purpose);

    if (!sent) {
      throw new BadRequestException('Failed to send OTP');
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; trustScore: number }> {
    const { phone, otp } = dto;

    // Find user
    const user = await this.userModel.findOne({ phone }).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find matching OTP
    const otpRecord = await this.otpModel
      .findOne({
        userId: new Types.ObjectId(user._id.toString()),
        phone,
        otp,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord) {
      // Increment failed attempts
      await this.userModel.findByIdAndUpdate(user._id, {
        $inc: { failedAttempts: 1 },
      });

      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Maximum verification attempts exceeded');
    }

    // Mark OTP as verified
    await this.otpModel.findByIdAndUpdate(otpRecord._id, {
      isVerified: true,
    });

    // Update user: verify phone and increase trust score
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user._id,
        {
          isPhoneVerified: true,
          $inc: { trustScore: 30 },
          failedAttempts: 0,
        },
        { new: true }
      )
      .lean();

    return {
      message: 'Phone verified successfully',
      trustScore: updatedUser.trustScore,
    };
  }

  /**
   * Increment trust score for address verification
   */
  async verifyAddress(userId: string, addressId: string): Promise<{ message: string; trustScore: number }> {
    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Mark address as verified
    await this.addressModel.findByIdAndUpdate(addressId, {
      isVerified: true,
    });

    // Increment trust score
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $inc: { trustScore: 20 } },
        { new: true }
      )
      .lean();

    return {
      message: 'Address verified successfully',
      trustScore: updatedUser.trustScore,
    };
  }

  /**
   * Confirm delivery (final trust boost)
   */
  async confirmDelivery(userId: string, orderId: string): Promise<{ message: string; trustScore: number }> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Mark all user addresses as verified after successful delivery
    await this.addressModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { isVerified: true }
    );

    // Big trust boost for completed delivery
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $inc: { trustScore: 30 } },
        { new: true }
      )
      .lean();

    return {
      message: 'Delivery confirmed. User marked as genuine.',
      trustScore: updatedUser.trustScore,
    };
  }
}
