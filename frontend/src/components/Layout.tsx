import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { ErrorBoundary } from './ErrorBoundary';
import { categoryPath } from './format';

export function Layout() {
  const [searchParams] = useSearchParams();
  const urlTerm = searchParams.get('q') ?? '';
  const { pathname } = useLocation();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              PC
            </span>
            Product Catalogue
          </Link>
          {/* Keyed by the URL term so the box resets on back/forward or when leaving search. */}
          <SearchBar key={urlTerm} initialTerm={urlTerm} />
        </div>
        <CategoryNav />
      </header>
      <main id="main" className="main">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <p className="footer__brand">Product Catalogue</p>
          <p>Proof of concept. Product data from the Fake Store API.</p>
        </div>
      </footer>
    </>
  );
}

function SearchBar({ initialTerm }: { initialTerm: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState(initialTerm);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    void navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <label htmlFor="search-term" className="visually-hidden">
        Search products
      </label>
      <input
        id="search-term"
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search products"
        maxLength={100}
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}

function CategoryNav() {
  const categories = useAsync(() => api.getCategories(), []);
  if (categories.status === 'loading') return null;
  // Navigation is secondary: if it fails, the page still works and the menu can be retried.
  if (categories.status === 'error') {
    return (
      <nav className="categories" aria-label="Categories">
        <p className="categories__error">
          Categories are unavailable.{' '}
          <button type="button" className="link-button" onClick={categories.retry}>
            Retry
          </button>
        </p>
      </nav>
    );
  }

  return (
    <nav className="categories" aria-label="Categories">
      <ul>
        {categories.data.map((category) => (
          <li key={category}>
            <NavLink to={categoryPath(category)}>{category}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
