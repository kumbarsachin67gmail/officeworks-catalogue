import { Link } from 'react-router';
import type { Product } from '../types/product';
import { formatPrice, formatRating, productPath } from './format';

/** One product in a grid. The whole tile links to the product page. */
export function ProductTile({ product }: { product: Product }) {
  return (
    <Link to={productPath(product.id)} className="tile">
      <div className="tile__image">
        <img src={product.image} alt="" loading="lazy" />
      </div>
      <h3 className="tile__title">{product.title}</h3>
      <p className="tile__price">{formatPrice(product.price)}</p>
      <p className="tile__rating">{formatRating(product.rating.rate, product.rating.count)}</p>
    </Link>
  );
}
