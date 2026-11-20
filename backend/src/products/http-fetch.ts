/**
 * The HTTP client the Fake Store repository uses. Injected through a token
 * so tests can replace the network with a fake.
 */
export const HTTP_FETCH = Symbol('HTTP_FETCH');

export type HttpFetch = typeof fetch;

export const httpFetchProvider = {
  provide: HTTP_FETCH,
  useValue: ((input, init) => fetch(input, init)) satisfies HttpFetch,
};
