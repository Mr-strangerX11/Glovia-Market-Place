import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('esewa/initiate/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate eSewa payment' })
  initiateEsewa(@Param('orderId') orderId: string) {
    return this.paymentsService.initiateEsewaPayment(orderId);
  }

  @Post('esewa/verify')
  @ApiOperation({ summary: 'Verify eSewa payment' })
  verifyEsewa(@Body() data: { oid: string; amt: string; refId: string }) {
    return this.paymentsService.verifyEsewaPayment(data);
  }

  @Post('khalti/initiate/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Khalti payment' })
  initiateKhalti(@Param('orderId') orderId: string) {
    return this.paymentsService.initiateKhaltiPayment(orderId);
  }

  @Post('khalti/verify')
  @ApiOperation({ summary: 'Verify Khalti payment' })
  verifyKhalti(
    @Body() data: { token: string; amount: number; orderId: string },
  ) {
    return this.paymentsService.verifyKhaltiPayment(data);
  }

  @Post('imepay/initiate/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate IME Pay payment' })
  initiateIME(@Param('orderId') orderId: string) {
    return this.paymentsService.initiateIMEPayment(orderId);
  }

  @Post('imepay/verify')
  @ApiOperation({ summary: 'Verify IME Pay payment' })
  verifyIME(
    @Body() data: { TransactionId: string; RefId: string; Msisdn: string },
  ) {
    return this.paymentsService.verifyIMEPayment(data);
  }
}
