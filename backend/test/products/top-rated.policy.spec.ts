import { describe, expect, it } from 'vitest';
import { TopRatedPolicy } from '../../src/products/top-rated.policy.js';
import { makeProduct, sampleCatalogue } from '../fakes/products.js';

const ids = (products: readonly { id: number }[]) => products.map((product) => product.id);

function policy(featuredProductIds: number[], categoryTopRatedCount = 3): TopRatedPolicy {
  return new TopRatedPolicy({ topRated: { featuredProductIds, categoryTopRatedCount } });
}

describe('TopRatedPolicy.orderFeatured', () => {
  it('returns the owner\'s chosen products in the configured order', () => {
    expect(ids(policy([17, 1, 9]).orderFeatured(sampleCatalogue))).toEqual([17, 1, 9]);
  });

  it('skips chosen ids that have no product', () => {
    expect(ids(policy([1, 999, 5]).orderFeatured(sampleCatalogue))).toEqual([1, 5]);
  });
});

describe('TopRatedPolicy.splitCategory', () => {
  const mensClothing = sampleCatalogue.filter((product) => product.category === "men's clothing");

  it('puts owner picks first, then fills with the highest rated', () => {
    // Owner picked 1 (rated 3.9). Best of the rest: 2 (4.7), 3 (4.1). Then 4 (2.1) is left over.
    const { topRated, others } = policy([1]).splitCategory(mensClothing);

    expect(ids(topRated)).toEqual([1, 2, 3]);
    expect(ids(others)).toEqual([4]);
  });

  it('ranks by rating alone when the owner picked nothing in the category', () => {
    const { topRated, others } = policy([17]).splitCategory(mensClothing);

    expect(ids(topRated)).toEqual([2, 3, 1]);
    expect(ids(others)).toEqual([4]);
  });

  it('breaks rating ties by number of ratings, then by lower id', () => {
    const tied = [
      makeProduct({ id: 7, rating: { rate: 4, count: 10 } }),
      makeProduct({ id: 5, rating: { rate: 4, count: 10 } }),
      makeProduct({ id: 6, rating: { rate: 4, count: 99 } }),
    ];

    expect(ids(policy([], 3).splitCategory(tied).topRated)).toEqual([6, 5, 7]);
  });

  it('keeps every owner pick even when there are more than the count', () => {
    const { topRated, others } = policy([4, 3, 2], 2).splitCategory(mensClothing);

    expect(ids(topRated)).toEqual([4, 3, 2]);
    expect(ids(others)).toEqual([1]);
  });

  it('never lists a product in both groups, and loses none', () => {
    const { topRated, others } = policy([2]).splitCategory(mensClothing);
    const all = [...ids(topRated), ...ids(others)];

    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(ids(mensClothing).sort());
  });

  it('handles a category smaller than the count', () => {
    const { topRated, others } = policy([], 3).splitCategory([makeProduct({ id: 1 })]);

    expect(ids(topRated)).toEqual([1]);
    expect(others).toEqual([]);
  });
});
