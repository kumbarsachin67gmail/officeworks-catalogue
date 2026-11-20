import type { Product } from '../src/types/product';

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id' | 'title'>): Product {
  return {
    price: 10,
    description: `Description of ${overrides.title}`,
    category: 'electronics',
    image: `https://example.com/${overrides.id}.png`,
    rating: { rate: 4, count: 100 },
    ...overrides,
  };
}

export const backpack = makeProduct({ id: 1, title: 'Foldsack Backpack', price: 109.95, category: "men's clothing" });
export const cottonJacket = makeProduct({ id: 3, title: 'Mens Cotton Jacket', price: 55.99, category: "men's clothing" });
export const slimShirt = makeProduct({ id: 4, title: 'Mens Casual Slim Fit', price: 15.99, category: "men's clothing" });
export const bracelet = makeProduct({ id: 5, title: 'Dragon Bracelet', price: 695, category: 'jewelery' });
export const hardDrive = makeProduct({ id: 9, title: 'Portable Hard Drive', price: 64, category: 'electronics' });
export const monitor = makeProduct({ id: 13, title: 'Acer Monitor', price: 599, category: 'electronics' });
export const rainJacket = makeProduct({ id: 17, title: 'Rain Jacket Women', price: 39.99, category: "women's clothing" });

export const featured = [backpack, bracelet, hardDrive, monitor, rainJacket];
export const categories = ['electronics', 'jewelery', "men's clothing", "women's clothing"];
