import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ApiError } from '../api/client';
import { EnquiryForm } from '../components/EnquiryForm';
import { categoryPath, formatPrice, formatRating } from '../components/format';
import { Status } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function ProductPage() {
  const { id = '' } = useParams();
  const productId = Number(id);
  const product = useAsync(() => {
    if (!Number.isInteger(productId) || productId < 1) {
      return Promise.reject(new ApiError("Sorry, we couldn't find that.", 404));
    }
    return api.getProduct(productId);
  }, [productId]);

  return (
    <Status state={product} loadingLabel="Loading product…">
      {(loaded) => (
        <article className="product">
          <div className="product__image">
            <img src={loaded.image} alt={loaded.title} />
          </div>
          <div className="product__details">
            <p className="product__category">
              <Link to={categoryPath(loaded.category)} className="capitalise">
                {loaded.category}
              </Link>
            </p>
            <h1>{loaded.title}</h1>
            <p className="product__price">{formatPrice(loaded.price)}</p>
            <p className="product__rating">{formatRating(loaded.rating.rate, loaded.rating.count)}</p>
            <p className="product__description">{loaded.description}</p>
            <EnquirySection productId={loaded.id} productTitle={loaded.title} />
          </div>
        </article>
      )}
    </Status>
  );
}

/** The form only appears after the customer clicks Enquire. */
function EnquirySection({ productId, productTitle }: { productId: number; productTitle: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="button button--large" onClick={() => setOpen(true)}>
        Enquire
      </button>
    );
  }
  return (
    <section className="product__enquiry" aria-labelledby="enquiry-heading">
      <h2 id="enquiry-heading">Enquire about this product</h2>
      <EnquiryForm productId={productId} productTitle={productTitle} />
    </section>
  );
}
