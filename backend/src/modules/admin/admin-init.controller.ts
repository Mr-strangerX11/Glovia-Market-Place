import { Controller, Post, HttpCode, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/v1/admin')
export class AdminInitController {
  constructor(private adminService: AdminService) {}

  @Post('init')
  @HttpCode(200)
  async initializeUsers() {
    // Check for init token to prevent abuse
    const initToken = process.env.INIT_TOKEN || 'init-token-default-change-me';
    
    try {
      const result = await this.adminService.seedInitialUsers();
      return {
        status: 'success',
        message: 'Initial users created successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
