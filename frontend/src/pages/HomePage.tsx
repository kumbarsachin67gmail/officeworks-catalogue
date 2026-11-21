import { Link } from 'react-router';
import { api } from '../api/client';
import { categoryPath } from '../components/format';
import { GridSkeleton, ProductGrid } from '../components/ProductGrid';
import { Status } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

/** How many products each category row on the home page shows. */
const PRODUCTS_PER_CATEGORY_ROW = 4;

export function HomePage() {
  const featured = useAsync(() => api.getFeaturedProducts(), []);
  const categories = useAsync(() => api.getCategories(), []);

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__content">
          <p className="hero__eyebrow">Product catalogue</p>
          <h1 id="hero-heading">Find what you need, and ask us about it</h1>
          <p className="hero__text">
            Browse by category, search the whole range, and send an enquiry from any product page.
          </p>
          <a className="button button--large button--light" href="#top-rated-heading">
            Shop top rated
          </a>
        </div>
      </section>

      {/* The owner's chosen products always come first (acceptance criterion 1). */}
      <section className="band" aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading">Top rated</h2>
        <p className="lead">Our featured products.</p>
        <Status state={featured} loadingLabel="Loading featured products…" placeholder={<GridSkeleton count={5} />}>
          {(products) => (
            <ProductGrid products={products} emptyMessage="No featured products right now." badge="Top rated" />
          )}
        </Status>
      </section>

      {/* Browsing extras: if they fail, the featured products above are unaffected. */}
      {categories.status === 'success' && categories.data.length > 0 && (
        <>
          <section aria-labelledby="shop-by-category-heading">
            <h2 id="shop-by-category-heading">Shop by category</h2>
            <ul className="category-cards">
              {categories.data.map((category) => (
                <li key={category}>
                  <Link to={categoryPath(category)} className="category-card">
                    <span className="category-card__name">{category}</span>
                    <span className="category-card__cta" aria-hidden="true">
                      Shop now →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {categories.data.map((category) => (
            <CategoryRow key={category} category={category} />
          ))}
        </>
      )}
    </>
  );
}

/** A few products from one category, in the order the backend ranks them, with a link to the rest. */
function CategoryRow({ category }: { category: string }) {
  const view = useAsync(() => api.getCategory(category), [category]);
  const headingId = `row-${category.replace(/[^a-z0-9]+/gi, '-')}`;

  return (
    <section className="row" aria-labelledby={headingId}>
      <div className="row__header">
        <h2 id={headingId}>
          Popular in <span className="capitalise">{category}</span>
        </h2>
        <Link to={categoryPath(category)} className="row__link">
          See all <span className="visually-hidden">{category}</span> →
        </Link>
      </div>
      <Status
        state={view}
        loadingLabel={`Loading ${category}…`}
        placeholder={<GridSkeleton count={PRODUCTS_PER_CATEGORY_ROW} />}
      >
        {({ topRated, others }) => (
          <ProductGrid
            products={[...topRated, ...others].slice(0, PRODUCTS_PER_CATEGORY_ROW)}
            emptyMessage="No products in this category yet."
          />
        )}
      </Status>
    </section>
  );
}
