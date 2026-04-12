
import { Controller, Get, Param, Post, Put, Delete, Body, UseGuards, HttpCode, Req, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CategoriesService } from './categories.service';
import { AuditLogService } from '../auditlog/auditlog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private categoriesService: CategoriesService,
    private auditLogService: AuditLogService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get all categories' })
  async findAll(@Res({ passthrough: true }) res: Response) {
    const categories = await this.categoriesService.findAll();
    res.setHeader('Access-Control-Allow-Origin', res.getHeader('Access-Control-Allow-Origin') || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return categories;
  }

  @Get('parent/:parentId')
  @ApiOperation({ summary: 'Get sub-categories by parent category id' })
  findByParent(@Param('parentId') parentId: string) {
    return this.categoriesService.findByParent(parentId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category' })
  create(@Body() dto: any) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const category = await this.categoriesService.update(id, dto);
    // Audit log
    const admin = req.user || {};
    const adminId = admin._id || admin.id || admin.userId;
    const adminEmail = admin.email || admin.username || 'unknown';
    try {
      if (adminId) {
        await this.auditLogService.log(
          'UPDATE_CATEGORY',
          adminId,
          adminEmail,
          id,
          { dto }
        );
      }
    } catch {
      // Do not fail category update if audit logging fails
    }
    return category;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const result = await this.categoriesService.remove(id);
    // Audit log
    const admin = req.user || {};
    const adminId = admin._id || admin.id || admin.userId;
    const adminEmail = admin.email || admin.username || 'unknown';
    try {
      if (adminId) {
        await this.auditLogService.log(
          'DELETE_CATEGORY',
          adminId,
          adminEmail,
          id,
          {}
        );
      }
    } catch {
      // Do not fail category delete if audit logging fails
    }
    return result;
  }

  @Post('seed')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Seed initial categories' })
  seed() {
    return this.categoriesService.seedInitialCategories();
  }
}
