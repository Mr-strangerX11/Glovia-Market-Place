import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  getWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to wishlist' })
  addItem(
    @CurrentUser('id') userId: string,
    @Body() data: { productId: string },
  ) {
    return this.wishlistService.addToWishlist(userId, data.productId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  removeItem(@CurrentUser('id') userId: string, @Param('id') itemId: string) {
    return this.wishlistService.removeFromWishlist(userId, itemId);
  }
}
