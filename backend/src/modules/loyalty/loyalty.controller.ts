import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole } from '../../database/schemas';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  @Get('admin/points')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllLoyaltyPoints() {
    const users = await this.userModel
      .find({}, { firstName: 1, lastName: 1, email: 1, role: 1, loyaltyPoints: 1 })
      .sort({ loyaltyPoints: -1, createdAt: -1 })
      .lean();

    return users.map((user: any) => ({
      userId: String(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      points: Number(user.loyaltyPoints || 0),
    }));
  }

  @Get('me')
  async getMyLoyalty(@CurrentUser('id') userId: string) {
    const user = await this.userModel.findById(userId, { loyaltyPoints: 1 }).lean();
    return { userId, points: Number(user?.loyaltyPoints || 0) };
  }

  @Get(':userId')
  async getLoyalty(
    @Param('userId') userId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ) {
    const isAdmin = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN;
    if (!isAdmin && currentUserId !== userId) {
      throw new ForbiddenException('You can only view your own loyalty points');
    }

    const user = await this.userModel.findById(userId, { loyaltyPoints: 1 }).lean();
    return { userId, points: Number(user?.loyaltyPoints || 0) };
  }

  @Post('add')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async addPoints(@Body() body: { userId: string; points: number }) {
    if (!Types.ObjectId.isValid(body.userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const pointsToAdd = Number(body.points || 0);
    if (!Number.isFinite(pointsToAdd)) {
      throw new BadRequestException('Invalid points value');
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        body.userId,
        { $inc: { loyaltyPoints: pointsToAdd } },
        { new: true, projection: { loyaltyPoints: 1 } },
      )
      .lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return { userId: body.userId, points: Number((user as any).loyaltyPoints || 0) };
  }
}
