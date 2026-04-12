import { Controller, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuditLogService } from '../auditlog/auditlog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/schemas/user.schema';

@ApiTags('AdminUsers')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private usersService: UsersService,
    private auditLogService: AuditLogService,
  ) {}

  @Put(':id/permissions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user permissions' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() permissions: Record<string, boolean>,
    @Req() req: any,
  ) {
    const updatedUser = await this.usersService.updateUserPermissions(id, permissions);
    // Log the action
    const admin = req.user;
    await this.auditLogService.log(
      'UPDATE_USER_PERMISSIONS',
      admin._id,
      admin.email,
      id,
      { permissions }
    );
    return updatedUser;
  }
}
