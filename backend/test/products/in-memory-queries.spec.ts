import { describe, expect, it } from 'vitest';
import { listCategories, matchesSearchTerm, search } from '../../src/products/in-memory-queries.js';
import { InMemoryProductRepository } from '../fakes/in-memory-product.repository.js';
import { makeProduct, sampleCatalogue } from '../fakes/products.js';
import { describeProductRepositoryContract } from './product-repository.contract.js';

const ids = (products: readonly { id: number }[]) => products.map((product) => product.id);

describe('search', () => {
  it('matches the start of a word, so "men" finds men\'s clothing but not women\'s', () => {
    expect(ids(search(sampleCatalogue, 'men'))).toEqual([1, 2, 3, 4]);
  });

  it('ignores case', () => {
    expect(ids(search(sampleCatalogue, 'JACKET'))).toEqual([2, 17]);
  });

  it('matches title, description and category', () => {
    const product = makeProduct({ id: 1, title: 'Lamp', description: 'Warm light', category: 'home' });

    expect(matchesSearchTerm(product, 'lamp')).toBe(true);
    expect(matchesSearchTerm(product, 'warm')).toBe(true);
    expect(matchesSearchTerm(product, 'home')).toBe(true);
    expect(matchesSearchTerm(product, 'amp')).toBe(false);
  });

  it('matches multi-word terms as a phrase', () => {
    expect(ids(search(sampleCatalogue, 'cotton jacket'))).toEqual([2]);
  });

  it('treats regex characters as plain text', () => {
    const product = makeProduct({ id: 1, title: 'Monitor (21.5 inch)' });

    expect(matchesSearchTerm(product, '(21.5')).toBe(true);
    expect(matchesSearchTerm(product, '.*')).toBe(false);
  });

  it('returns nothing when nothing matches', () => {
    expect(search(sampleCatalogue, 'zzz')).toEqual([]);
  });
});

describe('listCategories', () => {
  it('lists each category once, sorted', () => {
    expect(listCategories(sampleCatalogue)).toEqual(['electronics', 'jewelery', "men's clothing", "women's clothing"]);
  });
});

describeProductRepositoryContract('InMemoryProductRepository (test fake)', () => new InMemoryProductRepository(sampleCatalogue));
