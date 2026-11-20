import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { categoryPath } from './format';

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="brand">
            Product Catalogue
          </Link>
          <SearchBar />
        </div>
        <CategoryNav />
      </header>
      <main id="main" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>Proof of concept. Product data from the Fake Store API.</p>
      </footer>
    </>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTerm = searchParams.get('q') ?? '';
  const [term, setTerm] = useState(urlTerm);

  // Keep the box in step with the URL (back/forward, or leaving the search page).
  useEffect(() => setTerm(urlTerm), [urlTerm]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
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
  // Navigation is secondary: if categories fail to load, the page still works without it.
  if (categories.status !== 'success') return null;

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
