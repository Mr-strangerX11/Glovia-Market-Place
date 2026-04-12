import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailOtpDto } from './dto/auth.dto';
import { User, UserRole } from '../../database/schemas/user.schema';
import { OtpVerification } from '../../database/schemas/otp-verification.schema';
import { OtpService, EmailOtpService } from '../verification/otp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(OtpVerification.name) private otpVerificationModel: Model<OtpVerification>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private emailOtpService: EmailOtpService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, deviceFingerprint?: string) {
    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email }, { phone: dto.phone }],
    }).lean();

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.CUSTOMER,
      ipAddress,
      deviceFingerprint,
      isEmailVerified: false, // Always require email verification
    });

    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await this.otpVerificationModel.create({
      userId: user._id,
      phone: user.email,
      otp,
      purpose: 'email_verification',
      expiresAt,
    });

    // Send OTP via email
    const sent = await this.emailOtpService.sendEmailOtp(user.email, otp, 'email_verification');
    if (!sent) {
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      nextStep: 'VERIFY_EMAIL',
      userId: user._id.toString(),
      email: user.email,
      isEmailVerified: false,
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Please verify your email before logging in. Check your inbox for verification code.');
    }

    await this.userModel.findByIdAndUpdate(
      user._id,
      {
        lastLoginAt: new Date(),
        ipAddress,
        failedAttempts: 0,
      },
      { new: true },
    );

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        trustScore: user.trustScore,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userModel.findOne({ email }).lean();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account blocked. Contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.userModel.findByIdAndUpdate(
        user._id,
        { $inc: { failedAttempts: 1 } },
        { new: true },
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userModel.findByIdAndUpdate(
      userId,
      { refreshToken: hashedRefreshToken },
      { new: true },
    );
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(new Types.ObjectId(userId)).lean();

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(
      userId,
      { refreshToken: null },
      { new: true },
    );
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = dto;

    if (!email) {
      throw new BadRequestException('Provide email');
    }

    const user = await this.userModel.findOne({ email }).lean();
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await this.otpVerificationModel.create({
      userId: user._id,
      phone: email,
      otp,
      purpose: 'password_reset',
      expiresAt,
    });

    const sent = await this.emailOtpService.sendEmailOtp(email, otp, 'password_reset');
    if (!sent) {
      throw new BadRequestException('Failed to send password reset email');
    }

    return { message: 'Password reset OTP sent to your email' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = dto;

    const user = await this.userModel.findOne({ email }).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otpRecord = await this.otpVerificationModel.findOne({
      userId: user._id,
      phone: email,
      otp,
      purpose: 'password_reset',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Maximum attempts exceeded');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userModel.findByIdAndUpdate(
      user._id,
      {
        password: hashedPassword,
        refreshToken: null,
        failedAttempts: 0,
      },
      { new: true },
    );

    await this.otpVerificationModel.findByIdAndUpdate(
      otpRecord._id,
      { $set: { isVerified: true }, $inc: { attempts: 1 } },
      { new: true },
    );

    return { message: 'Password reset successfully' };
  }

  async verifyEmailOtp(dto: VerifyEmailOtpDto): Promise<{ message: string; success: boolean; user?: any; accessToken?: string; refreshToken?: string }> {
    const { email, otp } = dto;

    const user = await this.userModel.findOne({ email }).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified. Please login.');
    }

    const otpRecord = await this.otpVerificationModel.findOne({
      userId: user._id,
      phone: email,
      otp,
      purpose: 'email_verification',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    if (!otpRecord) {
      // Check if OTP exists but wrong code
      const anyOtpRecord = await this.otpVerificationModel.findOne({
        userId: user._id,
        phone: email,
        purpose: 'email_verification',
        isVerified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 }).lean();

      if (anyOtpRecord) {
        // Increment attempts
        await this.otpVerificationModel.findByIdAndUpdate(
          anyOtpRecord._id,
          { $inc: { attempts: 1 } },
          { new: true },
        );
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

    const updatedUser = await this.userModel.findByIdAndUpdate(
      user._id,
      { isEmailVerified: true, $inc: { trustScore: 20 } },
      { new: true },
    ).lean();

    const tokens = await this.generateTokens(updatedUser._id.toString(), updatedUser.email, updatedUser.role);
    await this.updateRefreshToken(updatedUser._id.toString(), tokens.refreshToken);

    return {
      success: true,
      message: 'Email verified successfully. You can now login.',
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isEmailVerified: true,
        trustScore: updatedUser.trustScore,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async resendVerificationOtp(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email }).lean();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await this.otpVerificationModel.create({
      userId: user._id,
      phone: user.email,
      otp,
      purpose: 'email_verification',
      expiresAt,
    });

    const sent = await this.emailOtpService.sendEmailOtp(user.email, otp, 'email_verification');
    if (!sent) {
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      message: 'Verification OTP resent successfully. Please check your email.',
    };
  }

  async getEmailDeliveryHealth() {
    return this.emailOtpService.getDeliveryHealth();
  }
}
