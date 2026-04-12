import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../../database/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    console.log('JwtStrategy: validating payload:', payload);
    
    const user = await this.userModel.findById(new Types.ObjectId(payload.sub))
      .select('email phone firstName lastName role profileImage')
      .lean();

    console.log('JwtStrategy: user found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('JwtStrategy: user not found, returning null');
      return null;
    }

    // Remove _id from user object and use id instead
    const { _id, ...userWithoutId } = user as any;
    const result = {
      id: _id?.toString() || payload.sub,
      ...userWithoutId,
    };
    
    console.log('JwtStrategy: returning user with id:', result.id);
    return result;
  }
}
