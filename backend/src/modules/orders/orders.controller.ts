import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOrderDto, TrackOrderDto } from './dto/orders.dto';
import { OrderStatus } from '../../database/schemas/order.schema';
import { TrustScoreGuard } from '../../common/guards/trust-score.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Get('track')
  @ApiOperation({ summary: 'Track order by order number and email/phone' })
  track(@Query() query: TrackOrderDto) {
    return this.ordersService.trackOrder(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @UseGuards(JwtAuthGuard)  // Temporarily removed TrustScoreGuard for debugging
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    console.log('OrdersController: userId received:', userId);
    return this.ordersService.create(userId, dto);
  }

  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get user orders' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAll(userId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') orderId: string) {
    return this.ordersService.findOne(userId, orderId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancel(@CurrentUser('id') userId: string, @Param('id') orderId: string) {
    return this.ordersService.cancelOrder(userId, orderId);
  }
}
