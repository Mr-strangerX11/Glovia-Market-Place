import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get product recommendations' })
  async getRecommendations(
    @Query('userId') userId: string,
    @Query('productId') productId: string,
  ) {
    return this.recommendationsService.getRecommendations(userId, productId);
  }
}

