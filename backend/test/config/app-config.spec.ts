import { describe, expect, it } from 'vitest';
import { loadAppConfig } from '../../src/config/app-config.js';

describe('loadAppConfig', () => {
  it('uses working local defaults when nothing is set', () => {
    const config = loadAppConfig({});

    expect(config.port).toBe(3000);
    expect(config.fakeStore).toEqual({ baseUrl: 'https://fakestoreapi.com', timeoutMs: 5000, cacheTtlMs: 300_000 });
    expect(config.topRated).toEqual({ featuredProductIds: [1, 5, 9, 13, 17], categoryTopRatedCount: 3 });
    expect(config.email).toMatchObject({ smtpHost: 'localhost', smtpPort: 1025, smtpSecure: false, smtpUser: undefined });
  });

  it('reads values from the environment', () => {
    const config = loadAppConfig({
      PORT: '4000',
      FAKE_STORE_BASE_URL: 'https://example.com/api/',
      FEATURED_PRODUCT_IDS: ' 3, 1 ,3,2 ',
      CATEGORY_TOP_RATED_COUNT: '2',
      SMTP_SECURE: 'TRUE',
      SMTP_USER: 'user',
      SALES_INBOX_EMAIL: 'sales@shop.test',
    });

    expect(config.port).toBe(4000);
    expect(config.fakeStore.baseUrl).toBe('https://example.com/api');
    expect(config.topRated.featuredProductIds).toEqual([3, 1, 2]);
    expect(config.topRated.categoryTopRatedCount).toBe(2);
    expect(config.email).toMatchObject({ smtpSecure: true, smtpUser: 'user', salesInbox: 'sales@shop.test' });
  });

  it.each([
    ['PORT', 'abc'],
    ['FAKE_STORE_TIMEOUT_MS', '-1'],
    ['FEATURED_PRODUCT_IDS', '1,two,3'],
    ['FEATURED_PRODUCT_IDS', '1,0'],
    ['SMTP_SECURE', 'yes'],
  ])('fails at startup when %s is "%s"', (name, value) => {
    expect(() => loadAppConfig({ [name]: value })).toThrow(name);
  });
});
