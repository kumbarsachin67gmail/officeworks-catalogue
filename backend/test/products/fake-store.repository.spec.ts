import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAppConfig } from '../../src/config/app-config.js';
import { FakeStoreRepository, RETRY_AFTER_FAILURE_MS } from '../../src/products/fake-store.repository.js';
import type { HttpFetch } from '../../src/products/http-fetch.js';
import { makeProduct, sampleCatalogue } from '../fakes/products.js';
import { describeProductRepositoryContract } from './product-repository.contract.js';

const TTL_MS = 60_000;
const TIMEOUT_MS = 5_000;
const config = loadAppConfig({
  FAKE_STORE_BASE_URL: 'https://store.test',
  PRODUCT_CACHE_TTL_MS: String(TTL_MS),
  FAKE_STORE_TIMEOUT_MS: String(TIMEOUT_MS),
});

const catalogue = [
  makeProduct({ id: 1, category: 'electronics' }),
  makeProduct({ id: 2, category: 'jewelery' }),
];

const okResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/** A fetch that never answers until its abort signal fires, like a hung server. */
const hangingFetch: HttpFetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });

describe('FakeStoreRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches /products and maps it into products', async () => {
    const fetch = vi.fn<HttpFetch>().mockResolvedValue(okResponse(catalogue));
    const repository = new FakeStoreRepository(config, fetch);

    expect(await repository.findById(2)).toEqual(catalogue[1]);
    expect(fetch).toHaveBeenCalledWith('https://store.test/products', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('serves from the cache until the TTL ends, then fetches again', async () => {
    const fetch = vi.fn<HttpFetch>().mockImplementation(async () => okResponse(catalogue));
    const repository = new FakeStoreRepository(config, fetch);

    await repository.listCategories();
    await repository.findById(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TTL_MS);
    await repository.findById(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shares one fetch between concurrent requests', async () => {
    const fetch = vi.fn<HttpFetch>().mockImplementation(async () => okResponse(catalogue));
    const repository = new FakeStoreRepository(config, fetch);

    await Promise.all([repository.findById(1), repository.search('product'), repository.listCategories()]);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('answers 503 when Fake Store fails and nothing is cached, logging the underlying cause', async () => {
    const networkError = new TypeError('fetch failed', {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND store.test'), { code: 'ENOTFOUND' }),
    });
    const repository = new FakeStoreRepository(config, vi.fn<HttpFetch>().mockRejectedValue(networkError));

    await expect(repository.findById(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('fetch failed <- caused by: getaddrinfo ENOTFOUND store.test [ENOTFOUND]'),
    );
  });

  it('recovers on the next request once Fake Store is back after a failed first load', async () => {
    const fetch = vi
      .fn<HttpFetch>()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockImplementation(async () => okResponse(catalogue));
    const repository = new FakeStoreRepository(config, fetch);

    await expect(repository.findById(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(await repository.findById(1)).toEqual(catalogue[0]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['an error status', () => new Response('oops', { status: 500 })],
    ['a body that is not a list', () => okResponse({ products: [] })],
    ['an empty list', () => okResponse([])],
  ])('treats %s as a failure', async (_label, respond) => {
    const repository = new FakeStoreRepository(config, vi.fn<HttpFetch>().mockImplementation(async () => respond()));

    await expect(repository.listCategories()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('times out a hung request and answers 503', async () => {
    const repository = new FakeStoreRepository(config, hangingFetch);

    const result = expect(repository.findById(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await result;
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining(`timed out after ${TIMEOUT_MS} ms`));
  });

  it('serves stale products when a refresh fails, and waits before retrying', async () => {
    const fetch = vi
      .fn<HttpFetch>()
      .mockResolvedValueOnce(okResponse(catalogue))
      .mockRejectedValue(new Error('ECONNRESET'));
    const repository = new FakeStoreRepository(config, fetch);

    await repository.findById(1);
    vi.advanceTimersByTime(TTL_MS);

    expect(await repository.findById(2)).toEqual(catalogue[1]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining(`serving cached products loaded ${TTL_MS / 1000}s ago`));

    await repository.findById(2);
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(RETRY_AFTER_FAILURE_MS);
    await repository.findById(2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('skips items with an unexpected shape and keeps the rest', async () => {
    const broken = [{ id: 'x' }, { ...catalogue[0], rating: undefined }, catalogue[1]];
    const repository = new FakeStoreRepository(config, vi.fn<HttpFetch>().mockResolvedValue(okResponse(broken)));

    expect(await repository.listCategories()).toEqual(['jewelery']);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Skipped 2'));
  });
});

describeProductRepositoryContract('FakeStoreRepository', () =>
  new FakeStoreRepository(config, async () => okResponse(sampleCatalogue)),
);
