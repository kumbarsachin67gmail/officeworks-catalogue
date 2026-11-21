import { useParams } from 'react-router';
import { api } from '../api/client';
import { GridSkeleton, ProductGrid } from '../components/ProductGrid';
import { Status } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function CategoryPage() {
  // React Router decodes the URL, so "men's%20clothing" arrives as "men's clothing".
  const { category = '' } = useParams();
  const view = useAsync(() => api.getCategory(category), [category]);

  return (
    <Status state={view} loadingLabel="Loading category…" placeholder={<GridSkeleton count={4} />}>
      {({ category: name, topRated, others }) => (
        <>
          <h1 className="capitalise">{name}</h1>
          <section aria-labelledby="top-rated-heading">
            <h2 id="top-rated-heading">Top rated</h2>
            <ProductGrid
              products={topRated}
              emptyMessage="No top rated products in this category."
              badge="Top rated"
            />
          </section>
          <section aria-labelledby="more-heading">
            <h2 id="more-heading">More in this category</h2>
            <ProductGrid products={others} emptyMessage="No other products in this category." />
          </section>
        </>
      )}
    </Status>
  );
}
