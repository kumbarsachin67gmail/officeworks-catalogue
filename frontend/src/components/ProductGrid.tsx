import type { Product } from '../types/product';
import { ProductTile } from './ProductTile';

interface ProductGridProps {
  products: Product[];
  emptyMessage: string;
}

export function ProductGrid({ products, emptyMessage }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }
  return (
    <ul className="grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
