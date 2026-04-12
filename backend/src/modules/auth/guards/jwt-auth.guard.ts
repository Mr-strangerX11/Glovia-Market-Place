import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: any) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (result instanceof Promise) {
      return result.then(res => {
        console.log('JwtAuthGuard: result:', res);
        console.log('JwtAuthGuard: user attached to request:', JSON.stringify(request.user));
        return res;
      });
    } else {
      console.log('JwtAuthGuard: result:', result);
      console.log('JwtAuthGuard: user attached to request:', JSON.stringify(request.user));
      return result;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.message?.includes('jwt')) {
        throw new UnauthorizedException('Session expired. Please login again.');
      }
      throw new UnauthorizedException('Authentication required. Please login.');
    }
    return user;
  }
}

