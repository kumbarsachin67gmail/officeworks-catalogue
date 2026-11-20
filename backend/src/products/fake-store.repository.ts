import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { describeError } from '../describe-error.js';
import { HTTP_FETCH, type HttpFetch } from './http-fetch.js';
import * as queries from './in-memory-queries.js';
import type { Product } from './product.js';
import type { ProductRepository } from './product.repository.js';

/** After a failed refresh, keep serving cached data for this long before trying again. */
export const RETRY_AFTER_FAILURE_MS = 30_000;

/**
 * Reads products from the Fake Store API.
 *
 * Fake Store has ~20 products and no server-side search, so the whole
 * catalogue is fetched once and cached in memory:
 * - fresh for `cacheTtlMs`; concurrent requests share one fetch
 * - each fetch is aborted after `timeoutMs`
 * - if a refresh fails, the last good catalogue is served (stale) and the
 *   next attempt waits RETRY_AFTER_FAILURE_MS
 * - if nothing has ever loaded, requests fail with 503
 */
@Injectable()
export class FakeStoreRepository implements ProductRepository {
  private readonly logger = new Logger(FakeStoreRepository.name);
  private readonly settings: AppConfig['fakeStore'];
  private catalogue: Product[] | undefined;
  private loadedAt = 0;
  private expiresAt = 0;
  private inFlight: Promise<Product[]> | undefined;

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(HTTP_FETCH) private readonly fetch: HttpFetch,
  ) {
    this.settings = config.fakeStore;
  }

  async findByIds(ids: readonly number[]): Promise<Product[]> {
    return queries.findByIds(await this.getCatalogue(), ids);
  }

  async findById(id: number): Promise<Product | undefined> {
    return queries.findById(await this.getCatalogue(), id);
  }

  async findByCategory(category: string): Promise<Product[]> {
    return queries.findByCategory(await this.getCatalogue(), category);
  }

  async listCategories(): Promise<string[]> {
    return queries.listCategories(await this.getCatalogue());
  }

  async search(term: string): Promise<Product[]> {
    return queries.search(await this.getCatalogue(), term);
  }

  private async getCatalogue(): Promise<Product[]> {
    if (this.catalogue && Date.now() < this.expiresAt) return this.catalogue;
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.fetchCatalogue();
      this.catalogue = products;
      this.loadedAt = Date.now();
      this.expiresAt = this.loadedAt + this.settings.cacheTtlMs;
      return products;
    } catch (error) {
      const reason = describeError(error);
      if (this.catalogue) {
        const ageSeconds = Math.round((Date.now() - this.loadedAt) / 1000);
        this.logger.warn(`Fake Store refresh failed, serving cached products loaded ${ageSeconds}s ago: ${reason}`);
        this.expiresAt = Date.now() + RETRY_AFTER_FAILURE_MS;
        return this.catalogue;
      }
      this.logger.error(`Fake Store unavailable and nothing cached: ${reason}`);
      throw new ServiceUnavailableException('Products are unavailable right now. Please try again shortly.');
    }
  }

  private async fetchCatalogue(): Promise<Product[]> {
    const { baseUrl, timeoutMs } = this.settings;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetch(`${baseUrl}/products`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Fake Store answered HTTP ${response.status}`);
      return this.parseCatalogue(await response.json());
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Fake Store timed out after ${timeoutMs} ms`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseCatalogue(body: unknown): Product[] {
    if (!Array.isArray(body)) throw new Error('Fake Store response was not a list of products');
    const products = body.map(toProduct).filter((product) => product !== undefined);
    const skipped = body.length - products.length;
    if (skipped > 0) this.logger.warn(`Skipped ${skipped} Fake Store item(s) with an unexpected shape`);
    if (products.length === 0) throw new Error('Fake Store returned no usable products');
    return products;
  }
}

/** Maps one Fake Store item into our Product, or undefined if it does not have the expected shape. */
function toProduct(raw: unknown): Product | undefined {
  if (!isRecord(raw) || !isRecord(raw.rating)) return undefined;
  const { id, title, price, description, category, image, rating } = raw;
  if (
    typeof id !== 'number' || !Number.isInteger(id) || id < 1 ||
    typeof title !== 'string' ||
    typeof price !== 'number' || !Number.isFinite(price) ||
    typeof description !== 'string' ||
    typeof category !== 'string' ||
    typeof image !== 'string' ||
    typeof rating.rate !== 'number' ||
    typeof rating.count !== 'number'
  ) {
    return undefined;
  }
  return { id, title, price, description, category, image, rating: { rate: rating.rate, count: rating.count } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
