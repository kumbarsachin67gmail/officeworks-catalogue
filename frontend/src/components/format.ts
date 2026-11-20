// Fake Store prices are in US dollars; they are shown as given, labelled USD.
const priceFormat = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });

export function formatPrice(price: number): string {
  return priceFormat.format(price);
}

export function formatRating(rate: number, count: number): string {
  return `${rate.toFixed(1)} out of 5 (${count} ${count === 1 ? 'rating' : 'ratings'})`;
}

export function categoryPath(category: string): string {
  return `/categories/${encodeURIComponent(category)}`;
}

export function productPath(id: number): string {
  return `/products/${id}`;
}
