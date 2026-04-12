import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';

@ApiTags('Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get analytics overview' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get sales analytics' })
  getSales(@Query() query: any) {
    return this.analyticsService.getSales(query);
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get revenue analytics' })
  getRevenue(@Query() query: any) {
    return this.analyticsService.getRevenue(query);
  }

  @Get('top-products')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get top selling products' })
  getTopProducts(@Query() query: any) {
    return this.analyticsService.getTopProducts(query);
  }

  @Get('top-customers')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get top customers' })
  getTopCustomers(@Query() query: any) {
    return this.analyticsService.getTopCustomers(query);
  }

  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get order stats' })
  getOrdersStats(@Query() query: any) {
    return this.analyticsService.getOrdersStats(query);
  }
}
