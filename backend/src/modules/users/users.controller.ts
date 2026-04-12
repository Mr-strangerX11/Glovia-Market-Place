import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  SendEmailChangeOtpDto,
  VerifyEmailChangeOtpDto,
} from './dto/users.dto';
import { AddAddressWithGeoDto } from './dto/add-address-geo.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('profile/email-change/send-otp')
  @ApiOperation({ summary: 'Send OTP to new email for profile email change' })
  sendEmailChangeOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: SendEmailChangeOtpDto,
  ) {
    return this.usersService.sendEmailChangeOtp(userId, dto.email);
  }

  @Post('profile/email-change/verify-otp')
  @ApiOperation({ summary: 'Verify OTP for profile email change' })
  verifyEmailChangeOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyEmailChangeOtpDto,
  ) {
    return this.usersService.verifyEmailChangeOtp(userId, dto.email, dto.otp);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create new address' })
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Post('addresses/geo')
  @ApiOperation({ summary: 'Create address with geo-coordinates (auto-verified)' })
  createAddressWithGeo(
    @CurrentUser('id') userId: string,
    @Body() dto: AddAddressWithGeoDto,
  ) {
    return this.usersService.createAddressWithGeo(userId, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order history' })
  getOrderHistory(@CurrentUser('id') userId: string) {
    return this.usersService.getOrderHistory(userId);
  }

  @Get('vendor/status')
  @ApiOperation({ summary: 'Get vendor account status (frozen status, type, etc.)' })
  getVendorStatus(@CurrentUser('id') userId: string) {
    return this.usersService.getVendorStatus(userId);
  }
}
