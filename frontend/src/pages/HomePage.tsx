import { api } from '../api/client';
import { ProductGrid } from '../components/ProductGrid';
import { Status } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function HomePage() {
  const featured = useAsync(() => api.getFeaturedProducts(), []);

  return (
    <section aria-labelledby="featured-heading">
      <h1 id="featured-heading">Top rated</h1>
      <p className="lead">Our five featured products.</p>
      <Status state={featured} loadingLabel="Loading featured products…">
        {(products) => <ProductGrid products={products} emptyMessage="No featured products right now." />}
      </Status>
    </section>
  );
}
