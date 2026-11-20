import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { api, ApiError } from '../src/api/client';
import { backpack, categories, cottonJacket, featured, rainJacket, slimShirt } from './fixtures';

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
  mockedApi.getProduct.mockImplementation(async (id) => {
    const product = [...featured, cottonJacket, slimShirt].find((candidate) => candidate.id === id);
    if (!product) throw new ApiError("Sorry, we couldn't find that.", 404);
    return product;
  });
});

describe('Home page', () => {
  it('shows the 5 featured products the owner chose, in order', async () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'Top rated' })).toBeInTheDocument();
    const grid = await within(screen.getByRole('main')).findByRole('list');
    const tiles = within(grid).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles.map((tile) => within(tile).getByRole('heading').textContent)).toEqual(featured.map((p) => p.title));
  });

  it('shows a friendly error and can try again', async () => {
    mockedApi.getFeaturedProducts.mockRejectedValueOnce(new ApiError('Products are unavailable right now.', 503));
    const user = renderAt('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Products are unavailable right now.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findAllByRole('link', { name: /Foldsack Backpack/ })).toHaveLength(1);
    expect(mockedApi.getFeaturedProducts).toHaveBeenCalledTimes(2);
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

it('shows a not-found page for unknown addresses', async () => {
  renderAt('/nowhere');

  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});
