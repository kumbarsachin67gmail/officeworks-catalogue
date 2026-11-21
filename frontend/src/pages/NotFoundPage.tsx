import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="empty">
        We couldn't find that page. <Link to="/">Go to the home page</Link>.
      </p>
    </>
  );
}
