/**
 * Our own product model. Data sources (Fake Store today, a database later)
 * map their data into this shape, so the rest of the app never depends on
 * a particular source's format.
 */
export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface CategoryView {
  category: string;
  topRated: Product[];
  others: Product[];
}
