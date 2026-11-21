import type { Product } from './product.js';

/**
 * The only way the app reads product data.
 *
 * Fake Store is one implementation (FakeStoreRepository). Adding a database
 * means writing another class that implements this interface and changing
 * the PRODUCT_REPOSITORY provider in products.module.ts.
 *
 * Implementations throw ServiceUnavailableException when the source cannot
 * be reached (wrap driver/connection errors), so the API answers 503, not 500.
 *
 * test/products/product-repository.contract.ts holds the shared behaviour tests;
 * run them against any new implementation.
 */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  /** Products with the given ids, in any order. Unknown ids are left out. */
  findByIds(ids: readonly number[]): Promise<Product[]>;
  findById(id: number): Promise<Product | undefined>;
  /** Exact category name match. Empty when the category does not exist. */
  findByCategory(category: string): Promise<Product[]>;
  /** Distinct category names, sorted A–Z. */
  listCategories(): Promise<string[]>;
  /**
   * Products where a word in the title, description or category starts with
   * the term, ignoring case ("men" matches "men's clothing", not "women's").
   * A word starts at the beginning of the text or after any character that is
   * not a letter or digit. The term is plain text, not a pattern.
   * In SQL this is roughly a case-insensitive `\m<term>` regex on each field.
   */
  search(term: string): Promise<Product[]>;
}
