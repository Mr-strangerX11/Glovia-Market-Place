import { Controller, Post, Delete, Get, Body, Query, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { Response } from 'express';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Public: subscribe
  @Post('newsletter')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @Body() body: { email: string; source?: string },
  ) {
    const result = await this.subscriptionsService.subscribe(body.email, body.source);
    return result;
  }

  // Public: unsubscribe via query param (for email links)
  @Delete('newsletter')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Query('email') email: string) {
    return this.subscriptionsService.unsubscribe(email);
  }

  // Admin only: export subscribers as Excel (MUST BE BEFORE generic GET)
  @Get('newsletter/export/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async exportSubscribersToExcel(@Res() res: Response) {
    try {
      const buffer = await this.subscriptionsService.exportSubscribersToExcel();
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="glovia-subscribers-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buffer.length,
      });

      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to export subscribers',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Admin only: list all subscribers
  @Get('newsletter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllSubscribers(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const subscribers = await this.subscriptionsService.getAllSubscribers(
      limit ? parseInt(limit, 10) : undefined,
      skip ? parseInt(skip, 10) : undefined,
    );
    const count = await this.subscriptionsService.getSubscriberCount();
    return {
      subscribers,
      total: count,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    };
  }
}
