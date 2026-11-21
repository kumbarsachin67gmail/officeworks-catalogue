import type { CSSProperties } from 'react';
import type { Product } from '../types/product';
import { ProductTile } from './ProductTile';

interface ProductGridProps {
  products: Product[];
  emptyMessage: string;
  /** Optional label shown on every tile, such as "Top rated". */
  badge?: string;
}

export function ProductGrid({ products, emptyMessage, badge }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }
  return (
    <ul className="grid">
      {products.map((product, index) => (
        // --index staggers the tiles' entrance animation (see .grid > li in styles.css).
        <li key={product.id} style={{ '--index': index } as CSSProperties}>
          <ProductTile product={product} badge={badge} />
        </li>
      ))}
    </ul>
  );
}

/** Grey placeholder tiles shown while products load. */
export function GridSkeleton({ count }: { count: number }) {
  return (
    <ul className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="tile tile--skeleton">
            <div className="tile__image skeleton" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        </li>
      ))}
    </ul>
  );
}
