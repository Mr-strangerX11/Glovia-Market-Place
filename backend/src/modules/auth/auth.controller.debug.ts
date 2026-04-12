import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@Controller('debug')
export class DebugController {
  constructor(private configService: ConfigService) {}

  @Public()
  @Get('env-check')
  checkEnv() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    
    return {
      hasJwtSecret: !!jwtSecret,
      jwtSecretLength: jwtSecret?.length || 0,
      jwtSecretPreview: jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT SET',
      hasDatabaseUrl: !!dbUrl,
      nodeEnv: process.env.NODE_ENV,
      frontendUrl: this.configService.get<string>('FRONTEND_URL'),
    };
  }
}
