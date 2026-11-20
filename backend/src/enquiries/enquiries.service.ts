import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { Product } from '../products/product.js';
import { ProductsService } from '../products/products.service.js';
import type { CreateEnquiryDto } from './create-enquiry.dto.js';
import { EMAIL_SENDER, type EmailMessage, type EmailSender } from './email-sender.js';

export const THANK_YOU_MESSAGE = 'Thank you for your enquiry. Our sales team will be in touch soon.';

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);
  private readonly salesInbox: string;

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly products: ProductsService,
  ) {
    this.salesInbox = config.email.salesInbox;
  }

  /** Emails the enquiry to the sales inbox. 404 if the product is unknown, 503 if sending fails. */
  async submit(enquiry: CreateEnquiryDto): Promise<{ message: string }> {
    const product = await this.products.getById(enquiry.productId);
    const email = buildEnquiryEmail(enquiry, product, this.salesInbox);
    try {
      await this.emailSender.send(email);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Enquiry email for product ${product.id} was not sent: ${reason}`);
      throw new ServiceUnavailableException("We couldn't send your enquiry right now. Please try again shortly.");
    }
    return { message: THANK_YOU_MESSAGE };
  }
}

export function buildEnquiryEmail(enquiry: CreateEnquiryDto, product: Product, salesInbox: string): EmailMessage {
  const text = [
    'New product enquiry',
    '',
    `Product: ${product.title} (id ${product.id})`,
    '',
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone ?? 'not given'}`,
    '',
    'Message:',
    enquiry.message ?? '(no message)',
  ].join('\n');

  return {
    to: salesInbox,
    replyTo: enquiry.email,
    // Product titles come from the data source; keep the subject on one line.
    subject: `New enquiry: ${product.title}`.replace(/\s+/g, ' '),
    text,
  };
}
