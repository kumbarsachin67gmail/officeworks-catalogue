/**
 * Our own product model. Data sources (Fake Store today, a database later)
 * map their data into this shape, so the rest of the app never depends on
 * a particular source's format.
 *
 * Read-only because repositories may hand out cached objects.
 * Mirrored by frontend/src/types/product.ts; the e2e test pins the JSON field names.
 */
export interface Product {
  readonly id: number;
  readonly title: string;
  readonly price: number;
  readonly description: string;
  readonly category: string;
  readonly image: string;
  readonly rating: {
    readonly rate: number;
    readonly count: number;
  };
}

export interface CategoryView {
  readonly category: string;
  readonly topRated: readonly Product[];
  readonly others: readonly Product[];
}
