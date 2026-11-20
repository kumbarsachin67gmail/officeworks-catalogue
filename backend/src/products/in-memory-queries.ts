import type { Product } from './product.js';

/**
 * Query helpers for repositories that hold the whole catalogue in memory
 * (Fake Store with its cache, and the test fake). A database repository
 * would do the same work in SQL instead.
 */

export function findByIds(products: readonly Product[], ids: readonly number[]): Product[] {
  const wanted = new Set(ids);
  return products.filter((product) => wanted.has(product.id));
}

export function findById(products: readonly Product[], id: number): Product | undefined {
  return products.find((product) => product.id === id);
}

export function findByCategory(products: readonly Product[], category: string): Product[] {
  return products.filter((product) => product.category === category);
}

export function listCategories(products: readonly Product[]): string[] {
  return [...new Set(products.map((product) => product.category))].sort();
}

export function search(products: readonly Product[], term: string): Product[] {
  return products.filter((product) => matchesSearchTerm(product, term));
}

/**
 * True when a word in the title, description or category starts with the
 * term, ignoring case. Word-start rather than substring, so "men" matches
 * "men's clothing" but not "women's clothing".
 */
export function matchesSearchTerm(product: Product, term: string): boolean {
  const normalised = term.trim();
  if (!normalised) return false;
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalised)}`, 'iu');
  return [product.title, product.description, product.category].some((text) => pattern.test(text));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
