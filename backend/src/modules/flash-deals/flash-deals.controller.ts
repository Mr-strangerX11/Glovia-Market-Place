import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FlashDealsService } from './flash-deals.service';
import { CreateFlashDealDto, UpdateFlashDealDto } from './dto/flash-deal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';

@Controller('flash-deals')
export class FlashDealsController {
  constructor(private readonly flashDealsService: FlashDealsService) {}

  // Public: Get active flash deals
  @Get('active')
  async getActiveFlashDeals() {
    const deals = await this.flashDealsService.getActiveFlashDeals();
    return {
      success: true,
      data: deals,
    };
  }

  // Public: Get all flash deals (paginated)
  @Get()
  async getAllFlashDeals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const result = await this.flashDealsService.getAllFlashDeals(pageNum, limitNum);
    return {
      success: true,
      ...result,
    };
  }

  // Public: Get single flash deal
  @Get(':id')
  async getFlashDealById(@Param('id') id: string) {
    const deal = await this.flashDealsService.getFlashDealById(id);
    return {
      success: true,
      data: deal,
    };
  }

  // Admin: Create flash deal
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async createFlashDeal(@Body() dto: CreateFlashDealDto, @Req() req: any) {
    const deal = await this.flashDealsService.createFlashDeal(dto, req.user.id);
    return {
      success: true,
      message: 'Flash deal created successfully',
      data: deal,
    };
  }

  // Admin: Update flash deal
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateFlashDeal(
    @Param('id') id: string,
    @Body() dto: UpdateFlashDealDto,
    @Req() req: any,
  ) {
    const deal = await this.flashDealsService.updateFlashDeal(id, dto, req.user.id);
    return {
      success: true,
      message: 'Flash deal updated successfully',
      data: deal,
    };
  }

  // Admin: Delete flash deal
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async deleteFlashDeal(@Param('id') id: string) {
    await this.flashDealsService.deleteFlashDeal(id);
    return {
      success: true,
      message: 'Flash deal deleted successfully',
    };
  }

  // Admin: Toggle flash deal
  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async toggleFlashDeal(@Param('id') id: string) {
    const deal = await this.flashDealsService.toggleFlashDeal(id);
    return {
      success: true,
      message: 'Flash deal toggled successfully',
      data: deal,
    };
  }

  // Admin: Reorder flash deals
  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async reorderFlashDeals(
    @Body('deals') deals: Array<{ id: string; order: number }>,
  ) {
    await this.flashDealsService.reorderFlashDeals(deals);
    return {
      success: true,
      message: 'Flash deals reordered successfully',
    };
  }

  // Public: Record view
  @Post(':id/view')
  async recordView(@Param('id') id: string) {
    await this.flashDealsService.recordView(id);
    return {
      success: true,
    };
  }

  // Public: Record click
  @Post(':id/click')
  async recordClick(@Param('id') id: string) {
    await this.flashDealsService.recordClick(id);
    return {
      success: true,
    };
  }

  // Admin: Get statistics
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getStatistics() {
    const stats = await this.flashDealsService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }
}
