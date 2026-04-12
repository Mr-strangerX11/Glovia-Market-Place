import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './auditlog.schema';
import { AuditLogService } from './auditlog.service';
import { AuditLogController } from './auditlog.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AuditLog', schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
