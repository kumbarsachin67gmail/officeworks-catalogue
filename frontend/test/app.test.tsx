import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { api, ApiError } from '../src/api/client';
import type { Product } from '../src/types/product';
import { backpack, categories, cottonJacket, featured, makeProduct, rainJacket, slimShirt } from './fixtures';

const allProducts = [...featured, cottonJacket, slimShirt];

/** A promise the test resolves later, to control the order answers arrive in. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// Pages are tested through the real UI with only the API client mocked.
vi.mock('../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api/client')>();
  return {
    ...actual,
    api: {
      getFeaturedProducts: vi.fn(),
      getProduct: vi.fn(),
      searchProducts: vi.fn(),
      getCategories: vi.fn(),
      getCategory: vi.fn(),
      submitEnquiry: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

function renderAt(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedApi.getCategories.mockResolvedValue(categories);
  mockedApi.getFeaturedProducts.mockResolvedValue(featured);
  // The home page shows a row per category; by default each row has the products of that category.
  mockedApi.getCategory.mockImplementation(async (category) => {
    const inCategory = allProducts.filter((product) => product.category === category);
    return { category, topRated: inCategory.slice(0, 1), others: inCategory.slice(1) };
  });
  mockedApi.getProduct.mockImplementation(async (id) => {
    const product = [...featured, cottonJacket, slimShirt].find((candidate) => candidate.id === id);
    if (!product) throw new ApiError("Sorry, we couldn't find that.", 404);
    return product;
  });
});

describe('Home page', () => {
  it('shows the 5 featured products the owner chose, in order, first on the page', async () => {
    renderAt('/');

    const topRated = screen.getByRole('region', { name: 'Top rated' });
    const grid = await within(topRated).findByRole('list');
    const tiles = within(grid).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles.map((tile) => within(tile).getByRole('heading').textContent)).toEqual(featured.map((p) => p.title));
    // Nothing else comes between the welcome banner and the featured products.
    const sections = within(screen.getByRole('main')).getAllByRole('region');
    expect(sections[0]).toHaveAccessibleName('Find what you need, and ask us about it');
    expect(sections[1]).toBe(topRated);
  });

  it('shows a friendly error and can try again', async () => {
    mockedApi.getFeaturedProducts.mockRejectedValueOnce(new ApiError('Products are unavailable right now.', 503));
    const user = renderAt('/');

    const topRated = screen.getByRole('region', { name: 'Top rated' });
    expect(await within(topRated).findByRole('alert')).toHaveTextContent('Products are unavailable right now.');
    await user.click(within(topRated).getByRole('button', { name: 'Try again' }));

    expect(await within(topRated).findAllByRole('link', { name: /Foldsack Backpack/ })).toHaveLength(1);
    expect(mockedApi.getFeaturedProducts).toHaveBeenCalledTimes(2);
  });

  it('links to every category and shows a few products from each', async () => {
    const shirts = Array.from({ length: 6 }, (_, index) =>
      makeProduct({ id: 100 + index, title: `Shirt ${index + 1}`, category: "men's clothing" }),
    );
    mockedApi.getCategory.mockImplementation(async (category) => ({
      category,
      topRated: category === "men's clothing" ? shirts.slice(0, 2) : [],
      others: category === "men's clothing" ? shirts.slice(2) : [],
    }));
    renderAt('/');

    const byCategory = await screen.findByRole('region', { name: 'Shop by category' });
    expect(within(byCategory).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      categories.map((category) => `/categories/${encodeURIComponent(category)}`),
    );

    // A row keeps the backend's order (top rated first) and stops at 4 products.
    const row = screen.getByRole('region', { name: "Popular in men's clothing" });
    await within(row).findByText('Shirt 1');
    const titles = within(row)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(['Shirt 1', 'Shirt 2', 'Shirt 3', 'Shirt 4']);
    expect(within(row).getByRole('link', { name: "See all men's clothing →" })).toHaveAttribute(
      'href',
      `/categories/${encodeURIComponent("men's clothing")}`,
    );
  });

  it('keeps the rest of the page working when one category row fails, and can retry it', async () => {
    mockedApi.getCategory.mockImplementation(async (category) => {
      if (category === 'jewelery') throw new ApiError('The catalogue is temporarily unavailable.', 503);
      return { category, topRated: [], others: allProducts.filter((product) => product.category === category) };
    });
    const user = renderAt('/');

    const failedRow = await screen.findByRole('region', { name: 'Popular in jewelery' });
    expect(await within(failedRow).findByRole('alert')).toHaveTextContent('The catalogue is temporarily unavailable.');
    const electronics = screen.getByRole('region', { name: 'Popular in electronics' });
    expect(await within(electronics).findAllByRole('link', { name: /Portable Hard Drive/ })).toHaveLength(1);
    expect(await within(screen.getByRole('region', { name: 'Top rated' })).findAllByRole('listitem')).toHaveLength(5);

    mockedApi.getCategory.mockResolvedValue({ category: 'jewelery', topRated: [], others: [] });
    await user.click(within(failedRow).getByRole('button', { name: 'Try again' }));
    expect(await within(failedRow).findByText('No products in this category yet.')).toBeInTheDocument();
  });

  it('shows placeholder tiles while products load', async () => {
    mockedApi.getFeaturedProducts.mockReturnValue(new Promise(() => {}));
    renderAt('/');

    const topRated = screen.getByRole('region', { name: 'Top rated' });
    expect(within(topRated).getByRole('status')).toHaveTextContent('Loading featured products…');
  });
});

describe('Category menu', () => {
  it('offers a retry when categories fail to load, and recovers', async () => {
    mockedApi.getCategories.mockRejectedValueOnce(new ApiError('The catalogue is temporarily unavailable.', 503));
    const user = renderAt('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    expect(nav).toHaveTextContent('Categories are unavailable.');
    await user.click(within(nav).getByRole('button', { name: 'Retry' }));

    // The menu is re-rendered after the retry, so look it up again.
    const reloaded = await screen.findByRole('navigation', { name: 'Categories' });
    expect(await within(reloaded).findByRole('link', { name: 'electronics' })).toBeInTheDocument();
  });
});

describe('Category page', () => {
  it('opens from a category link and shows top rated and more products', async () => {
    mockedApi.getCategory.mockResolvedValue({
      category: "men's clothing",
      topRated: [backpack, cottonJacket],
      others: [slimShirt],
    });
    const user = renderAt('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await user.click(within(nav).getByRole('link', { name: "men's clothing" }));

    expect(await screen.findByRole('heading', { level: 1, name: "men's clothing" })).toBeInTheDocument();
    expect(mockedApi.getCategory).toHaveBeenCalledWith("men's clothing");
    const topRated = screen.getByRole('region', { name: 'Top rated' });
    const more = screen.getByRole('region', { name: 'More in this category' });
    expect(within(topRated).getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining(backpack.title),
      expect.stringContaining(cottonJacket.title),
    ]);
    expect(within(more).getByRole('link', { name: new RegExp(slimShirt.title) })).toBeInTheDocument();
  });

  it('says so when the category does not exist', async () => {
    mockedApi.getCategory.mockRejectedValue(new ApiError("Sorry, we couldn't find that.", 404));
    renderAt('/categories/garden');

    expect(await screen.findByRole('alert')).toHaveTextContent("Sorry, we couldn't find that.");
  });
});

describe('Search', () => {
  it('shows only the products matching the term after clicking Search', async () => {
    mockedApi.searchProducts.mockResolvedValue([cottonJacket, rainJacket]);
    const user = renderAt('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  jacket ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Search results for “jacket”' })).toBeInTheDocument();
    expect(mockedApi.searchProducts).toHaveBeenCalledWith('jacket');
    expect(await screen.findByText('2 products found')).toBeInTheDocument();
    const results = within(screen.getByRole('main')).getAllByRole('listitem').map((item) => item.textContent);
    expect(results).toEqual([expect.stringContaining(cottonJacket.title), expect.stringContaining(rainJacket.title)]);
    expect(screen.queryByText(backpack.title)).not.toBeInTheDocument();
  });

  it('tells the user when nothing matches', async () => {
    mockedApi.searchProducts.mockResolvedValue([]);
    renderAt('/search?q=zzz');

    expect(await screen.findByText(/No products match your search/)).toBeInTheDocument();
  });

  it('keeps the term in the box on the results page and clears it after leaving', async () => {
    mockedApi.searchProducts.mockResolvedValue([cottonJacket]);
    const user = renderAt('/search?q=jacket');

    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('jacket');
    await user.click(await screen.findByRole('link', { name: 'Product Catalogue' }));

    expect(await screen.findByRole('heading', { name: 'Top rated' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('');
  });

  it('never shows results for an older search that answers late', async () => {
    const jacketAnswer = deferred<Product[]>();
    const shirtAnswer = deferred<Product[]>();
    mockedApi.searchProducts.mockImplementation((term) => (term === 'jacket' ? jacketAnswer.promise : shirtAnswer.promise));
    const user = renderAt('/search?q=jacket');

    const box = screen.getByRole('searchbox', { name: 'Search products' });
    await user.clear(box);
    await user.type(box, 'shirt');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    shirtAnswer.resolve([slimShirt]);
    expect(await screen.findByText('1 product found')).toBeInTheDocument();

    jacketAnswer.resolve([cottonJacket, rainJacket]);
    await waitFor(() => expect(mockedApi.searchProducts).toHaveBeenCalledTimes(2));
    await new Promise((settle) => setTimeout(settle, 0));

    expect(screen.getByRole('heading', { name: 'Search results for “shirt”' })).toBeInTheDocument();
    expect(screen.queryByText(cottonJacket.title)).not.toBeInTheDocument();
  });

  it('asks for a term when the search page is opened without one', () => {
    renderAt('/search?q=%20');

    expect(screen.getByText('Type a word in the search bar and press Search.')).toBeInTheDocument();
    expect(mockedApi.searchProducts).not.toHaveBeenCalled();
  });

  it('does not search for a blank term', async () => {
    const user = renderAt('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(mockedApi.searchProducts).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Top rated' })).toBeInTheDocument();
  });
});

describe('Product page', () => {
  it('opens when a product tile is clicked', async () => {
    const user = renderAt('/');

    await user.click(await screen.findByRole('link', { name: /Foldsack Backpack/ }));

    expect(await screen.findByRole('heading', { level: 1, name: backpack.title })).toBeInTheDocument();
    expect(mockedApi.getProduct).toHaveBeenCalledWith(backpack.id);
    expect(screen.getByText('USD 109.95')).toBeInTheDocument();
    expect(screen.getByText(backpack.description)).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: "men's clothing" })).toHaveAttribute(
      'href',
      "/categories/men's%20clothing",
    );
  });

  it('shows "not found" for an id that is not a number, without calling the API', async () => {
    renderAt('/products/abc');

    expect(await screen.findByRole('alert')).toHaveTextContent("Sorry, we couldn't find that.");
    expect(mockedApi.getProduct).not.toHaveBeenCalled();
  });
});

describe('Enquiry', () => {
  async function openEnquiryForm() {
    const user = renderAt(`/products/${cottonJacket.id}`);
    await screen.findByRole('heading', { level: 1, name: cottonJacket.title });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enquire' }));
    return user;
  }

  it('sends the enquiry and shows a thank you message', async () => {
    mockedApi.submitEnquiry.mockResolvedValue({ message: 'Thank you for your enquiry. Our sales team will be in touch soon.' });
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText(/Message/), 'Is this in stock?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const thanks = await screen.findByRole('status');
    expect(within(thanks).getByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(thanks).toHaveTextContent('Our sales team will be in touch soon.');
    expect(mockedApi.submitEnquiry).toHaveBeenCalledWith({
      productId: cottonJacket.id,
      name: 'Asha Rao',
      email: 'asha@example.com',
      message: 'Is this in stock?',
    });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('sends trimmed details including the phone number', async () => {
    mockedApi.submitEnquiry.mockResolvedValue({ message: 'Thank you for your enquiry.' });
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), '  Asha Rao  ');
    await user.type(screen.getByLabelText('Email'), ' asha@example.com ');
    await user.type(screen.getByLabelText(/Phone/), ' 0400 000 000 ');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    await screen.findByRole('heading', { name: 'Thank you' });
    expect(mockedApi.submitEnquiry).toHaveBeenCalledWith({
      productId: cottonJacket.id,
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '0400 000 000',
    });
  });

  it('sends only once while a submission is in progress', async () => {
    const answer = deferred<{ message: string }>();
    mockedApi.submitEnquiry.mockReturnValue(answer.promise);
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const sending = screen.getByRole('button', { name: 'Sending…' });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(mockedApi.submitEnquiry).toHaveBeenCalledTimes(1);

    answer.resolve({ message: 'Thank you for your enquiry.' });
    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
  });

  it('shows what to fix and sends nothing when details are missing or wrong', async () => {
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText(/Phone/), 'call me');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText(/Phone can only contain digits/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedApi.submitEnquiry).not.toHaveBeenCalled();
  });

  it('keeps what the customer typed and explains when sending fails', async () => {
    mockedApi.submitEnquiry.mockRejectedValue(
      new ApiError("We couldn't send your enquiry right now. Please try again shortly.", 503),
    );
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send your enquiry right now.");
    expect(screen.getByLabelText('Name')).toHaveValue('Asha Rao');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeEnabled());
  });
});

it('shows a friendly message instead of a blank page if a page fails to render, and keeps the header', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // A product without a rating breaks rendering: simulates a bug or an unexpected API shape.
  mockedApi.getProduct.mockResolvedValue({ ...backpack, rating: undefined } as unknown as Product);
  renderAt(`/products/${backpack.id}`);

  expect(await screen.findByText('Something went wrong showing this page.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument();
  expect(consoleError).toHaveBeenCalled();
});

it('shows a not-found page for unknown addresses', async () => {
  renderAt('/nowhere');

  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});
