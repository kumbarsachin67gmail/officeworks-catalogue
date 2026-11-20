import type { Product } from './product.js';

/**
 * The only way the app reads product data.
 *
 * Fake Store is one implementation (FakeStoreRepository). Adding a database
 * means writing another class that implements this interface and changing
 * the PRODUCT_REPOSITORY provider in products.module.ts.
 *
 * Implementations throw ServiceUnavailableException when the source cannot
 * be reached, so the API answers 503 instead of 500.
 */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  /** Products with the given ids, in any order. Unknown ids are left out. */
  findByIds(ids: readonly number[]): Promise<Product[]>;
  findById(id: number): Promise<Product | undefined>;
  /** Exact category name match. Empty when the category does not exist. */
  findByCategory(category: string): Promise<Product[]>;
  listCategories(): Promise<string[]>;
  /** Matching rules: see matchesSearchTerm in in-memory-queries.ts. */
  search(term: string): Promise<Product[]>;
}
