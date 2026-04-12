import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';

/**
 * Trust Score Guard Middleware
 * Prevents orders from users with insufficient verification
 */
@Injectable()
export class TrustScoreMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Fetch user trust score
    const userRecord = await this.userModel.findById(new Types.ObjectId(user.id))
      .select('trustScore isEmailVerified isPhoneVerified isBlocked')
      .lean();

    if (!userRecord) {
      throw new ForbiddenException('User not found');
    }

    if (userRecord.isBlocked) {
      throw new ForbiddenException('Account blocked. Contact support.');
    }

    // Minimum trust score required: 60
    // Email (20) + Phone (30) + Address/Activity (10+) = 60+
    if (userRecord.trustScore < 60) {
      const missing = [];
      if (!userRecord.isEmailVerified) missing.push('email verification');
      if (!userRecord.isPhoneVerified) missing.push('phone verification');

      throw new ForbiddenException({
        message: 'Insufficient verification to place orders',
        trustScore: userRecord.trustScore,
        required: 60,
        missing,
        hint: 'Complete email and phone verification to proceed',
      });
    }

    next();
  }
}
