import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { Product } from '../types/product';
import { formatPrice, formatRating, productPath } from './format';

interface ProductTileProps {
  product: Product;
  /** Optional label shown on the image, such as "Top rated". */
  badge?: string;
}

/** One product in a grid. The whole tile links to the product page. */
export function ProductTile({ product, badge }: ProductTileProps) {
  return (
    <Link to={productPath(product.id)} className="tile">
      <div className="tile__image">
        {badge && <span className="tile__badge">{badge}</span>}
        <img src={product.image} alt="" loading="lazy" />
      </div>
      <p className="tile__category">{product.category}</p>
      <h3 className="tile__title">{product.title}</h3>
      <p className="tile__rating">
        <Stars rate={product.rating.rate} />
        {formatRating(product.rating.rate, product.rating.count)}
      </p>
      <p className="tile__price">{formatPrice(product.price)}</p>
    </Link>
  );
}

/** A visual star bar. Screen readers get the rating as text next to it, so this is hidden from them. */
export function Stars({ rate }: { rate: number }) {
  // The fill width is data, so it is passed to the CSS as a variable; the look stays in styles.css.
  return <span className="stars" style={{ '--rating': rate } as CSSProperties} aria-hidden="true" />;
}
