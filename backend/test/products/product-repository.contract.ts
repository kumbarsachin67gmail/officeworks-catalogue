import { describe, expect, it } from 'vitest';
import type { ProductRepository } from '../../src/products/product.repository.js';

/**
 * Behaviour every ProductRepository must have, whatever the data source.
 * Run it against each implementation (and against a future database one) with
 * a factory that returns a repository holding `sampleCatalogue`.
 */
export function describeProductRepositoryContract(
  name: string,
  createRepository: () => ProductRepository | Promise<ProductRepository>,
): void {
  const ids = (products: readonly { id: number }[]) => products.map((product) => product.id).sort((a, b) => a - b);

  describe(`${name} meets the ProductRepository contract`, () => {
    it('finds products by id and leaves out unknown ids', async () => {
      const repository = await createRepository();

      expect((await repository.findById(5))?.title).toBe('Silver Dragon Bracelet');
      expect(await repository.findById(999)).toBeUndefined();
      expect(ids(await repository.findByIds([9, 999, 1]))).toEqual([1, 9]);
    });

    it('finds a category by exact name, and nothing for an unknown one', async () => {
      const repository = await createRepository();

      expect(ids(await repository.findByCategory('jewelery'))).toEqual([5, 6]);
      expect(await repository.findByCategory('Jewelery')).toEqual([]);
      expect(await repository.findByCategory('garden')).toEqual([]);
    });

    it('lists distinct categories sorted A–Z', async () => {
      const repository = await createRepository();

      expect(await repository.listCategories()).toEqual(['electronics', 'jewelery', "men's clothing", "women's clothing"]);
    });

    it('searches by word start, ignoring case, with the term as plain text', async () => {
      const repository = await createRepository();

      expect(ids(await repository.search('men'))).toEqual([1, 2, 3, 4]);
      expect(ids(await repository.search('JACKET'))).toEqual([2, 17]);
      expect(await repository.search('.*')).toEqual([]);
    });
  });
}
