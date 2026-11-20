import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { Product } from './product.js';

/**
 * The single place that decides what "top rated" means.
 *
 * Home page: the products the owner chose (FEATURED_PRODUCT_IDS), in that order.
 * Category page: the owner's chosen products in that category first, then the
 * highest-rated others until there are CATEGORY_TOP_RATED_COUNT. Owner picks are
 * never dropped, even if there are more of them than the count.
 * Ties are broken by number of ratings, then by lower id, so the order is stable.
 */
@Injectable()
export class TopRatedPolicy {
  private readonly featuredIds: readonly number[];
  private readonly categoryTopRatedCount: number;

  constructor(@Inject(APP_CONFIG) config: Pick<AppConfig, 'topRated'>) {
    this.featuredIds = config.topRated.featuredProductIds;
    this.categoryTopRatedCount = config.topRated.categoryTopRatedCount;
  }

  get featuredProductIds(): readonly number[] {
    return this.featuredIds;
  }

  /** The owner's chosen products in the configured order. Ids with no matching product are skipped. */
  orderFeatured(products: readonly Product[]): Product[] {
    const byId = new Map(products.map((product) => [product.id, product]));
    return this.featuredIds.map((id) => byId.get(id)).filter((product) => product !== undefined);
  }

  /** Splits one category's products into top rated and the rest. No product appears in both. */
  splitCategory(products: readonly Product[]): { topRated: Product[]; others: Product[] } {
    const ownerPicks = this.orderFeatured(products);
    const pickedIds = new Set(ownerPicks.map((product) => product.id));
    const fillCount = Math.max(0, this.categoryTopRatedCount - ownerPicks.length);
    const bestRated = products
      .filter((product) => !pickedIds.has(product.id))
      .sort(byRatingDescending)
      .slice(0, fillCount);

    const topRated = [...ownerPicks, ...bestRated];
    const topRatedIds = new Set(topRated.map((product) => product.id));
    const others = products.filter((product) => !topRatedIds.has(product.id));
    return { topRated, others };
  }
}

function byRatingDescending(a: Product, b: Product): number {
  return b.rating.rate - a.rating.rate || b.rating.count - a.rating.count || a.id - b.id;
}
