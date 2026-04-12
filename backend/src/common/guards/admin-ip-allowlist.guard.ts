import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

// Add your allowed admin IPs here
const ALLOWED_ADMIN_IPS = [
  '127.0.0.1', // localhost
  // '203.0.113.10', // example static IP
];

@Injectable()
export class AdminIpAllowlistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress;
    // Optionally normalize IPv6 localhost
    const normalizedIp = ip === '::1' ? '127.0.0.1' : ip;
    if (!ALLOWED_ADMIN_IPS.includes(normalizedIp)) {
      throw new ForbiddenException('Access denied: Your IP is not allowed.');
    }
    return true;
  }
}
