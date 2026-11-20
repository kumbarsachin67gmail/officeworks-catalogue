import { ServiceUnavailableException } from '@nestjs/common';
import * as queries from '../../src/products/in-memory-queries.js';
import type { Product } from '../../src/products/product.js';
import type { ProductRepository } from '../../src/products/product.repository.js';

/** Test double for ProductRepository. Set `unavailable` to simulate the data source being down. */
export class InMemoryProductRepository implements ProductRepository {
  unavailable = false;

  constructor(private readonly products: Product[]) {}

  async findByIds(ids: readonly number[]): Promise<Product[]> {
    return queries.findByIds(this.load(), ids);
  }

  async findById(id: number): Promise<Product | undefined> {
    return queries.findById(this.load(), id);
  }

  async findByCategory(category: string): Promise<Product[]> {
    return queries.findByCategory(this.load(), category);
  }

  async listCategories(): Promise<string[]> {
    return queries.listCategories(this.load());
  }

  async search(term: string): Promise<Product[]> {
    return queries.search(this.load(), term);
  }

  private load(): Product[] {
    if (this.unavailable) throw new ServiceUnavailableException('Products are unavailable right now. Please try again shortly.');
    return this.products;
  }
}
