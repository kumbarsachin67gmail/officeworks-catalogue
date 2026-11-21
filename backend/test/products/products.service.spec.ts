import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../../src/products/products.service.js';
import { TopRatedPolicy } from '../../src/products/top-rated.policy.js';
import { InMemoryProductRepository } from '../fakes/in-memory-product.repository.js';
import { sampleCatalogue } from '../fakes/products.js';

describe('ProductsService.getFeatured', () => {
  afterEach(() => vi.restoreAllMocks());

  it('warns about missing featured ids once, not on every visit', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const policy = new TopRatedPolicy({ topRated: { featuredProductIds: [1, 999, 5], categoryTopRatedCount: 3 } });
    const service = new ProductsService(new InMemoryProductRepository(sampleCatalogue), policy);

    await service.getFeatured();
    await service.getFeatured();
    await service.getFeatured();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Featured product ids not found and skipped: 999');
  });
});
