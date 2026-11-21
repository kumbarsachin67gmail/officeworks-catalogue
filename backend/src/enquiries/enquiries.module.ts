import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { EMAIL_SENDER } from './email-sender.js';
import { EnquiriesController } from './enquiries.controller.js';
import { EnquiriesService } from './enquiries.service.js';
import { SmtpEmailSender } from './smtp-email-sender.js';

@Module({
  imports: [ProductsModule],
  controllers: [EnquiriesController],
  providers: [
    EnquiriesService,
    // Swap the email provider here (e.g. an SES sender).
    { provide: EMAIL_SENDER, useClass: SmtpEmailSender },
  ],
})
export class EnquiriesModule {}
