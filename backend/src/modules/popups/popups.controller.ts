import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PopupsService } from './popups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';

@ApiTags('Popups')
@Controller('popups')
export class PopupsController {
  constructor(private popupsService: PopupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all popups' })
  findAll() {
    return this.popupsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active popups' })
  findActive() {
    return this.popupsService.findActive();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create popup' })
  create(@Body() dto: any) {
    return this.popupsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update popup' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.popupsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete popup' })
  remove(@Param('id') id: string) {
    return this.popupsService.remove(id);
  }
}
