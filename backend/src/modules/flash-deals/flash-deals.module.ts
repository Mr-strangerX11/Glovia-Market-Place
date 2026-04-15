import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlashDealsService } from './flash-deals.service';
import { FlashDealsController } from './flash-deals.controller';
import { FlashDealSchema } from '../../database/schemas/flash-deal.schema';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FlashDeal', schema: FlashDealSchema },
    ]),
    RealtimeModule,
  ],
  controllers: [FlashDealsController],
  providers: [FlashDealsService],
  exports: [FlashDealsService],
})
export class FlashDealsModule {}
