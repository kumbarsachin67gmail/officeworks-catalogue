import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CategoryView, Product } from './product.js';
import { PRODUCT_REPOSITORY, type ProductRepository } from './product.repository.js';
import { TopRatedPolicy } from './top-rated.policy.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  /** Last missing-id list warned about, so a bad FEATURED_PRODUCT_IDS warns once, not on every visit. */
  private lastMissingWarning = '';

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repository: ProductRepository,
    private readonly topRated: TopRatedPolicy,
  ) {}

  async getFeatured(): Promise<Product[]> {
    const ids = this.topRated.featuredProductIds;
    const featured = this.topRated.orderFeatured(await this.repository.findByIds(ids));
    const found = new Set(featured.map((product) => product.id));
    const missing = ids.filter((id) => !found.has(id)).join(', ');
    if (missing && missing !== this.lastMissingWarning) {
      this.logger.warn(`Featured product ids not found and skipped: ${missing}`);
    }
    this.lastMissingWarning = missing;
    return featured;
  }

  async getById(id: number): Promise<Product> {
    const product = await this.repository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  search(term: string): Promise<Product[]> {
    return this.repository.search(term);
  }

  listCategories(): Promise<string[]> {
    return this.repository.listCategories();
  }

  async getCategory(category: string): Promise<CategoryView> {
    const products = await this.repository.findByCategory(category);
    if (products.length === 0) throw new NotFoundException('Category not found');
    return { category, ...this.topRated.splitCategory(products) };
  }
}
