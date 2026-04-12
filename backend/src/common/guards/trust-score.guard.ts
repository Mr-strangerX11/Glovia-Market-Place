import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';

@Injectable()
export class TrustScoreGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Debug logging
    console.log('=== TrustScoreGuard ENTERED ===');
    console.log('TrustScoreGuard: Full user object:', JSON.stringify(user, null, 2));
    console.log('TrustScoreGuard: user.id value:', user?.id);
    console.log('TrustScoreGuard: user._id value:', user?._id);

    // Check for user existence - be more flexible with id detection
    if (!user) {
      console.log('TrustScoreGuard: No user found in request');
      throw new ForbiddenException('Authentication required. Please login to place orders.');
    }

    // Try multiple ways to get user ID
    let userId: string | undefined;
    
    if (user.id) {
      userId = typeof user.id === 'string' ? user.id : String(user.id);
    } else if (user._id) {
      userId = typeof user._id === 'string' ? user._id : String(user._id);
    } else if (user.sub) {
      // Fallback to JWT subject claim
      userId = typeof user.sub === 'string' ? user.sub : String(user.sub);
    }

    console.log('TrustScoreGuard: Extracted userId:', userId);

    if (!userId) {
      console.log('TrustScoreGuard: No user.id, user._id, or user.sub found');
      throw new ForbiddenException('Authentication incomplete. Please logout and login again.');
    }

    try {
      // Validate userId is a valid ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        console.log('TrustScoreGuard: Invalid userId format:', userId);
        throw new ForbiddenException('Invalid user session. Please logout and login again.');
      }

      const userRecord = await this.userModel.findById(new Types.ObjectId(userId))
        .select('trustScore isEmailVerified isPhoneVerified isBlocked')
        .lean();

      console.log('TrustScoreGuard: userRecord from DB:', JSON.stringify(userRecord));

      if (!userRecord) {
        console.log('TrustScoreGuard: User not found in database');
        throw new ForbiddenException('User account not found. Please login again.');
      }

      if (userRecord.isBlocked) {
        console.log('TrustScoreGuard: User is blocked');
        throw new ForbiddenException('Account blocked. Contact support for assistance.');
      }

      // Require email verification to place orders
      if (!userRecord.isEmailVerified) {
        console.log('TrustScoreGuard: Email not verified, user:', userRecord);
        throw new ForbiddenException({
          message: 'Email verification required to place orders',
          hint: 'Please verify your email address to proceed',
        });
      }

      console.log('TrustScoreGuard: ✅ All checks passed, allowing request');
      return true;
    } catch (error) {
      // Don't re-throw generic errors as ForbiddenException
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('TrustScoreGuard: ERROR occurred:', error);
      // Re-throw as a more generic error
      throw new ForbiddenException('Unable to verify account. Please try again or contact support.');
    }
  }
}
