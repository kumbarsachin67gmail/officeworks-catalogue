import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { APP_CONFIG, loadAppConfig } from '../src/config/app-config.js';
import { EMAIL_SENDER } from '../src/enquiries/email-sender.js';
import { THANK_YOU_MESSAGE } from '../src/enquiries/enquiries.service.js';
import { PRODUCT_REPOSITORY } from '../src/products/product.repository.js';
import { setupApp } from '../src/setup-app.js';
import { InMemoryProductRepository } from './fakes/in-memory-product.repository.js';
import { sampleCatalogue } from './fakes/products.js';
import { RecordingEmailSender } from './fakes/recording-email-sender.js';

const ids = (products: { id: number }[]) => products.map((product) => product.id);

describe('API (e2e, data source and email faked)', () => {
  let app: NestExpressApplication;
  const repository = new InMemoryProductRepository(sampleCatalogue);
  const emailSender = new RecordingEmailSender();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(loadAppConfig({ FEATURED_PRODUCT_IDS: '17,1,999,5', CATEGORY_TOP_RATED_COUNT: '3', SALES_INBOX_EMAIL: 'sales@shop.test' }))
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(repository)
      .overrideProvider(EMAIL_SENDER)
      .useValue(emailSender)
      .compile();
    moduleRef.useLogger(false);

    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.unavailable = false;
    emailSender.failWith = undefined;
    emailSender.sent.length = 0;
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  const api = () => request(app.getHttpServer());

  it('GET /api/health', async () => {
    await api().get('/api/health').expect(200, { status: 'ok' });
  });

  describe('GET /api/products/featured', () => {
    it('returns the owner-chosen products in order, skipping unknown ids', async () => {
      const { body } = await api().get('/api/products/featured').expect(200);
      expect(ids(body)).toEqual([17, 1, 5]);
    });

    it('answers 503 JSON when the product source is down', async () => {
      repository.unavailable = true;
      const { body } = await api().get('/api/products/featured').expect(503);
      expect(body).toMatchObject({ statusCode: 503, message: expect.stringContaining('unavailable') });
    });
  });

  describe('GET /api/products/search', () => {
    it('returns only matching products', async () => {
      const { body } = await api().get('/api/products/search').query({ q: 'jacket' }).expect(200);
      expect(ids(body)).toEqual([2, 17]);
    });

    it('trims the term', async () => {
      const { body } = await api().get('/api/products/search').query({ q: '  men  ' }).expect(200);
      expect(ids(body)).toEqual([1, 2, 3, 4]);
    });

    it.each([
      ['missing', ''],
      ['blank', '?q=%20%20'],
      ['too long', `?q=${'a'.repeat(101)}`],
      ['repeated', '?q=a&q=b'],
      ['with an unknown parameter', '?q=a&sort=price'],
    ])('answers 400 when the term is %s', async (_label, query) => {
      const { body } = await api().get(`/api/products/search${query}`).expect(400);
      expect(body.statusCode).toBe(400);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns the product', async () => {
      const { body } = await api().get('/api/products/5').expect(200);
      expect(body).toMatchObject({ id: 5, title: 'Silver Dragon Bracelet', category: 'jewelery' });
    });

    it('answers 404 for an unknown product', async () => {
      await api().get('/api/products/999').expect(404);
    });

    it.each(['abc', '0', '-1', '1.5', '0x10', '1e1', '007', '%205', '1.0'])('answers 400 for id "%s"', async (id) => {
      await api().get(`/api/products/${id}`).expect(400);
    });
  });

  describe('categories', () => {
    it('GET /api/categories lists category names', async () => {
      await api().get('/api/categories').expect(200, ['electronics', 'jewelery', "men's clothing", "women's clothing"]);
    });

    it('GET /api/categories/:category returns top rated and the rest, URL-decoded', async () => {
      const { body } = await api().get(`/api/categories/${encodeURIComponent("men's clothing")}`).expect(200);
      expect(body.category).toBe("men's clothing");
      // Owner picked 1; filled with best rated 2 (4.7) and 3 (4.1); 4 is left.
      expect(ids(body.topRated)).toEqual([1, 2, 3]);
      expect(ids(body.others)).toEqual([4]);
    });

    it('answers 404 for an unknown category', async () => {
      await api().get('/api/categories/garden').expect(404);
    });
  });

  describe('POST /api/enquiries', () => {
    const valid = { productId: 5, name: 'Asha Rao', email: 'asha@example.com', phone: '', message: 'Is this in stock?' };

    it('emails the sales inbox and says thank you', async () => {
      const { body } = await api().post('/api/enquiries').send(valid).expect(201);

      expect(body).toEqual({ message: THANK_YOU_MESSAGE });
      expect(emailSender.sent).toHaveLength(1);
      expect(emailSender.sent[0]).toMatchObject({
        to: 'sales@shop.test',
        replyTo: 'asha@example.com',
        subject: 'New enquiry: Silver Dragon Bracelet',
      });
      expect(emailSender.sent[0]?.text).toContain('Phone: not given');
    });

    it.each([
      ['no name', { ...valid, name: '  ' }],
      ['a two-line name', { ...valid, name: 'Asha\nBcc: x@example.com' }],
      ['an invalid email', { ...valid, email: 'not-an-email' }],
      ['letters in the phone', { ...valid, phone: 'call me' }],
      ['a message over 2000 characters', { ...valid, message: 'a'.repeat(2001) }],
      ['a product id that is text', { ...valid, productId: '5' }],
      ['an unknown field', { ...valid, isAdmin: true }],
    ])('answers 400 and sends nothing for %s', async (_label, body) => {
      await api().post('/api/enquiries').send(body).expect(400);
      expect(emailSender.sent).toHaveLength(0);
    });

    it('answers 404 for an unknown product', async () => {
      await api().post('/api/enquiries').send({ ...valid, productId: 999 }).expect(404);
      expect(emailSender.sent).toHaveLength(0);
    });

    it('answers 503 with a friendly message when email fails', async () => {
      emailSender.failWith = new Error('SMTP down');
      const { body } = await api().post('/api/enquiries').send(valid).expect(503);
      expect(body.message).toMatch(/couldn't send your enquiry/);
      expect(JSON.stringify(body)).not.toContain('SMTP down');
    });
  });

  it('answers 404 JSON for unknown routes', async () => {
    const { body } = await api().get('/api/nope').expect(404);
    expect(body.statusCode).toBe(404);
  });

  it('does not reveal the framework in headers', async () => {
    const response = await api().get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
