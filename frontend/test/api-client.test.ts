import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../src/api/client';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function errorFrom(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('calls the backend on the same origin under /api', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.getFeaturedProducts();

    expect(fetchMock).toHaveBeenCalledWith('/api/products/featured', expect.anything());
  });

  it('encodes category names and search terms', async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]));

    await api.getCategory("men's clothing");
    await api.searchProducts('tea & coffee');

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/categories/men's%20clothing");
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/products/search?q=tea%20%26%20coffee');
  });

  it('posts enquiries as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Thank you' }, 201));

    const result = await api.submitEnquiry({ productId: 3, name: 'Asha', email: 'asha@example.com' });

    expect(result).toEqual({ message: 'Thank you' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/enquiries');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init?.body as string)).toEqual({ productId: 3, name: 'Asha', email: 'asha@example.com' });
  });

  it('shows the backend validation messages for a 400', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 400, message: ['Enter your name', 'Enter a valid email address'] }, 400));

    const error = await errorFrom(api.submitEnquiry({ productId: 3, name: '', email: 'x' }));

    expect(error.status).toBe(400);
    expect(error.message).toBe('Enter your name. Enter a valid email address');
  });

  it('gives a friendly message for a 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 404, message: 'Product not found' }, 404));

    expect((await errorFrom(api.getProduct(999))).message).toBe("Sorry, we couldn't find that.");
  });

  it('shows the backend message for a 503', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 503, message: 'Products are unavailable right now.' }, 503));

    expect((await errorFrom(api.getFeaturedProducts())).message).toBe('Products are unavailable right now.');
  });

  it.each([502, 504])('treats a %s from the proxy as temporarily unavailable', async (status) => {
    fetchMock.mockResolvedValue(new Response('<html><h1>Bad Gateway</h1></html>', { status }));

    const error = await errorFrom(api.getFeaturedProducts());

    expect(error.message).toBe('This is temporarily unavailable. Please try again shortly.');
  });

  it('never shows server internals for a 500', async () => {
    fetchMock.mockResolvedValue(new Response('TypeError: x is undefined\n    at Object.<anonymous>', { status: 500 }));

    const error = await errorFrom(api.getFeaturedProducts());

    expect(error.message).toBe('Something went wrong on our side. Please try again.');
    expect(error.message).not.toContain('TypeError');
  });

  it('gives a friendly message when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await errorFrom(api.getCategories());

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/can't reach the catalogue/);
  });
});
