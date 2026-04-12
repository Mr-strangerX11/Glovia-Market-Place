import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Popup, PopupSchema } from './popups.schema';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Popup', schema: PopupSchema },
    ]),
  ],
  providers: [PopupsService],
  controllers: [PopupsController],
})
export class PopupsModule {}
