import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('wallet')
export class WalletController {
  @Get(':userId')
  getWallet(@Param('userId') userId: string) {
    // Starter logic: return wallet balance
    return { userId, balance: 1000 };
  }

  @Post('add')
  addFunds(@Body() body: { userId: string; amount: number }) {
    // Starter logic: add funds
    return { userId: body.userId, balance: 1000 + body.amount };
  }
}
