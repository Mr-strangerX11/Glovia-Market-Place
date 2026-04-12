import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Post('email/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email verification (resend)' })
  async sendEmailVerification(@CurrentUser('id') userId: string, @CurrentUser('email') email: string) {
    await this.verificationService.sendVerificationEmail(userId, email);
    return { message: 'Verification email sent' };
  }

  @Post('email/verify/:userId')
  @ApiOperation({ summary: 'Verify email using token from email link' })
  async verifyEmail(@Param('userId') userId: string) {
    return this.verificationService.verifyEmail(userId);
  }

  @Post('otp/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to phone' })
  async sendOtp(@Body() dto: SendOtpDto, @CurrentUser('id') userId: string) {
    return this.verificationService.sendOtp(dto, userId);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.verificationService.verifyOtp(dto);
  }

  @Post('address/:addressId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify address (admin/delivery confirmation)' })
  async verifyAddress(@CurrentUser('id') userId: string, @Param('addressId') addressId: string) {
    return this.verificationService.verifyAddress(userId, addressId);
  }

  @Post('delivery/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm delivery and boost trust score' })
  async confirmDelivery(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.verificationService.confirmDelivery(userId, orderId);
  }
}
