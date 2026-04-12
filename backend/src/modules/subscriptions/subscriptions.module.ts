import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { NewsletterSubscriberSchema } from '../../database/schemas/newsletter.schema';
import { EmailNotificationModule } from '../../common/services/email-notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NewsletterSubscriber', schema: NewsletterSubscriberSchema },
    ]),
    EmailNotificationModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
