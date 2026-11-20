import { Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAppConfig } from '../../src/config/app-config.js';
import type { CreateEnquiryDto } from '../../src/enquiries/create-enquiry.dto.js';
import { EnquiriesService, THANK_YOU_MESSAGE } from '../../src/enquiries/enquiries.service.js';
import { ProductsService } from '../../src/products/products.service.js';
import { TopRatedPolicy } from '../../src/products/top-rated.policy.js';
import { InMemoryProductRepository } from '../fakes/in-memory-product.repository.js';
import { makeProduct } from '../fakes/products.js';
import { RecordingEmailSender } from '../fakes/recording-email-sender.js';

const config = loadAppConfig({ SALES_INBOX_EMAIL: 'sales@shop.test' });
const product = makeProduct({ id: 7, title: 'Gold Ring' });

const enquiry: CreateEnquiryDto = {
  productId: 7,
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+61 400 000 000',
  message: 'Do you have this in size 7?',
};

describe('EnquiriesService', () => {
  let emailSender: RecordingEmailSender;
  let service: EnquiriesService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    emailSender = new RecordingEmailSender();
    const products = new ProductsService(new InMemoryProductRepository([product]), new TopRatedPolicy(config));
    service = new EnquiriesService(config, emailSender, products);
  });

  afterEach(() => vi.restoreAllMocks());

  it('emails the sales inbox in plain text, with reply-to set to the customer', async () => {
    const result = await service.submit(enquiry);

    expect(result).toEqual({ message: THANK_YOU_MESSAGE });
    expect(emailSender.sent).toHaveLength(1);
    const [email] = emailSender.sent;
    expect(email).toMatchObject({ to: 'sales@shop.test', replyTo: 'asha@example.com', subject: 'New enquiry: Gold Ring' });
    expect(email?.text).toContain('Product: Gold Ring (id 7)');
    expect(email?.text).toContain('Name: Asha Rao');
    expect(email?.text).toContain('Phone: +61 400 000 000');
    expect(email?.text).toContain('Do you have this in size 7?');
  });

  it('says when optional fields were not given', async () => {
    await service.submit({ productId: 7, name: 'Asha', email: 'asha@example.com' });

    expect(emailSender.sent[0]?.text).toContain('Phone: not given');
    expect(emailSender.sent[0]?.text).toContain('(no message)');
  });

  it('answers 404 and sends nothing when the product does not exist', async () => {
    await expect(service.submit({ ...enquiry, productId: 999 })).rejects.toBeInstanceOf(NotFoundException);
    expect(emailSender.sent).toHaveLength(0);
  });

  it('answers 503 with a friendly message when the email cannot be sent', async () => {
    emailSender.failWith = new Error('SMTP connection refused');

    const error = await service.submit(enquiry).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).message).toMatch(/couldn't send your enquiry/);
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('SMTP connection refused'));
  });

  it('keeps the subject on one line even if the product title has line breaks', async () => {
    const products = new ProductsService(
      new InMemoryProductRepository([makeProduct({ id: 7, title: 'Gold\r\nBcc: someone@example.com' })]),
      new TopRatedPolicy(config),
    );
    service = new EnquiriesService(config, emailSender, products);

    await service.submit(enquiry);

    expect(emailSender.sent[0]?.subject).toBe('New enquiry: Gold Bcc: someone@example.com');
  });
});
