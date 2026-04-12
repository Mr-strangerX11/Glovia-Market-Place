import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { Observable } from 'rxjs';

@Injectable()
export class VendorActiveGuard implements CanActivate {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true; // Let other guards handle authentication
    }

    return this.validateVendorStatus(userId);
  }

  private async validateVendorStatus(userId: string): Promise<boolean> {
    const user = await this.userModel
      .findById(userId)
      .select('isFrozen frozenReason')
      .lean();

    if (!user) {
      return true; // User not found, let other handlers deal with it
    }

    if (user.isFrozen) {
      throw new ForbiddenException(
        `Your vendor account has been frozen. Reason: ${user.frozenReason || 'Not specified'}. Please contact support.`,
      );
    }

    return true;
  }
}
