import type { Product } from '../../src/products/product.js';

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    title: `Product ${overrides.id}`,
    price: 10,
    description: 'A product used in tests',
    category: 'electronics',
    image: `https://example.com/${overrides.id}.png`,
    rating: { rate: 3, count: 10 },
    ...overrides,
  };
}

/** A small catalogue shaped like Fake Store's data. */
export const sampleCatalogue: Product[] = [
  makeProduct({ id: 1, title: "Mens Casual Backpack", category: "men's clothing", rating: { rate: 3.9, count: 120 } }),
  makeProduct({ id: 2, title: 'Mens Cotton Jacket', category: "men's clothing", rating: { rate: 4.7, count: 500 } }),
  makeProduct({ id: 3, title: 'Mens Slim Fit T-Shirt', category: "men's clothing", rating: { rate: 4.1, count: 259 } }),
  makeProduct({ id: 4, title: 'Mens Casual Shirt', category: "men's clothing", rating: { rate: 2.1, count: 430 } }),
  makeProduct({ id: 5, title: 'Silver Dragon Bracelet', category: 'jewelery', rating: { rate: 4.6, count: 400 } }),
  makeProduct({ id: 6, title: 'Gold Petite Micropave', category: 'jewelery', rating: { rate: 3.9, count: 70 } }),
  makeProduct({ id: 9, title: 'Portable External Hard Drive', category: 'electronics', rating: { rate: 3.3, count: 203 } }),
  makeProduct({ id: 10, title: 'SanDisk SSD 1TB', category: 'electronics', rating: { rate: 2.9, count: 470 } }),
  makeProduct({ id: 13, title: 'Acer 21.5 inch Monitor', category: 'electronics', rating: { rate: 2.9, count: 250 } }),
  makeProduct({ id: 17, title: "Women's Rain Jacket", category: "women's clothing", rating: { rate: 3.8, count: 679 } }),
  makeProduct({ id: 18, title: "Women's Boat Neck Top", category: "women's clothing", rating: { rate: 4.7, count: 130 } }),
];
