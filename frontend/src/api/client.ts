import type { CategoryView, EnquiryRequest, EnquiryResponse, Product } from '../types/product';

/**
 * The only file that talks to the backend. Pages and components call these
 * functions and never use fetch directly.
 *
 * Requests go to /api on the same origin (Vite or nginx forwards them to the
 * backend), so the browser never calls Fake Store or any other source.
 */

const API_BASE = '/api';

/** An error that is safe to show to the user as-is. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  getFeaturedProducts: () => request<Product[]>('/products/featured'),
  getProduct: (id: number) => request<Product>(`/products/${encodeURIComponent(String(id))}`),
  searchProducts: (term: string) => request<Product[]>(`/products/search?q=${encodeURIComponent(term)}`),
  getCategories: () => request<string[]>('/categories'),
  getCategory: (category: string) => request<CategoryView>(`/categories/${encodeURIComponent(category)}`),
  submitEnquiry: (enquiry: EnquiryRequest) =>
    request<EnquiryResponse>('/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry),
    }),
};

export type Api = typeof api;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError("We can't reach the catalogue right now. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    throw new ApiError(await friendlyMessage(response), response.status);
  }
  return (await response.json()) as T;
}

/**
 * Turns an error response into a message for people, never a stack trace.
 * The backend's 400 and 503 messages are written for users, so they are shown;
 * anything else gets a fixed message.
 */
async function friendlyMessage(response: Response): Promise<string> {
  const serverMessage = await readServerMessage(response);
  switch (response.status) {
    case 400:
      return serverMessage ?? 'Please check what you entered and try again.';
    case 404:
      return "Sorry, we couldn't find that.";
    case 503:
      return serverMessage ?? 'This is temporarily unavailable. Please try again shortly.';
    default:
      return 'Something went wrong on our side. Please try again.';
  }
}

async function readServerMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('message' in body)) return undefined;
    const { message } = body;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join('. ');
    return undefined;
  } catch {
    return undefined;
  }
}
