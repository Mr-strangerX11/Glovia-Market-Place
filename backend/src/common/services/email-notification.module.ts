import { Module, Global } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';

@Global()
@Module({
  providers: [EmailNotificationService],
  exports: [EmailNotificationService],
})
export class EmailNotificationModule {}
