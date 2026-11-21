import { useSearchParams } from 'react-router';
import { api } from '../api/client';
import { GridSkeleton, ProductGrid } from '../components/ProductGrid';
import { Status } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const term = (searchParams.get('q') ?? '').trim();

  if (!term) {
    return (
      <>
        <h1>Search</h1>
        <p className="empty">Type a word in the search bar and press Search.</p>
      </>
    );
  }
  return <SearchResults term={term} />;
}

function SearchResults({ term }: { term: string }) {
  const results = useAsync(() => api.searchProducts(term), [term]);

  return (
    <>
      <h1>Search results for “{term}”</h1>
      <Status state={results} loadingLabel="Searching…" placeholder={<GridSkeleton count={4} />}>
        {(products) => (
          <>
            <p className="lead" role="status">
              {products.length} {products.length === 1 ? 'product' : 'products'} found
            </p>
            <ProductGrid products={products} emptyMessage="No products match your search. Try a different word." />
          </>
        )}
      </Status>
    </>
  );
}
