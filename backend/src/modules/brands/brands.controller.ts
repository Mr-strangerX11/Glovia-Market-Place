import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  Req,
  Header
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { AuditLogService } from '../auditlog/auditlog.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';


@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Public endpoints
  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getAllBrands() {
    return {
      success: true,
      data: await this.brandsService.getAllBrands(),
    };
  }

  @Get('list')
  async getBrandsList() {
    return {
      success: true,
      data: await this.brandsService.getBrandsList(),
    };
  }

  @Get(':slug')
  async getBrandBySlug(@Param('slug') slug: string) {
    const brand = await this.brandsService.getBrandBySlug(slug);
    if (!brand) {
      return {
        success: false,
        message: 'Brand not found',
      };
    }
    return {
      success: true,
      data: brand,
    };
  }

  // Admin only endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBrand(@Body() dto: CreateBrandDto) {
    const brand = await this.brandsService.createBrand(dto);
    return {
      success: true,
      message: 'Brand created successfully',
      data: brand,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto, @Req() req: any) {
    const brand = await this.brandsService.updateBrand(id, dto);
    // Audit log
    const admin = req.user || {};
    const adminId = admin._id || admin.id || admin.userId;
    const adminEmail = admin.email || admin.username || 'unknown';
    try {
      if (adminId) {
        await this.auditLogService.log(
          'UPDATE_BRAND',
          adminId,
          adminEmail,
          id,
          { dto }
        );
      }
    } catch {
      // Do not fail brand update if audit logging fails
    }
    return {
      success: true,
      message: 'Brand updated successfully',
      data: brand,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteBrand(@Param('id') id: string, @Req() req: any) {
    await this.brandsService.deleteBrand(id);
    // Audit log
    const admin = req.user || {};
    const adminId = admin._id || admin.id || admin.userId;
    const adminEmail = admin.email || admin.username || 'unknown';
    try {
      if (adminId) {
        await this.auditLogService.log(
          'DELETE_BRAND',
          adminId,
          adminEmail,
          id,
          {}
        );
      }
    } catch {
      // Do not fail brand delete if audit logging fails
    }
    return {
      success: true,
      message: 'Brand deleted successfully',
    };
  }

  // Admin analytics endpoint
  @Get('admin/analytics')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getBrandAnalytics() {
    const analytics = await this.brandsService.getBrandAnalytics();
    return {
      success: true,
      data: analytics,
    };
  }
}
