import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../api/client';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

type Settled<T> = Exclude<AsyncState<T>, { status: 'loading' }>;

/**
 * The one loading/error/data pattern used by every page.
 * Re-runs `load` when `deps` change and offers `retry` for the error state.
 *
 * Each result remembers the deps it was loaded for. While the current deps have
 * no result yet, the state is "loading", so a stale answer is never shown and
 * no extra render is needed to reset to loading.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: DependencyList; state: Settled<T> }>();
  const key = [...deps, attempt];

  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setResult({ key, state: { status: 'success', data } }),
      (error: unknown) => current && setResult({ key, state: { status: 'error', message: toMessage(error) } }),
    );
    return () => {
      current = false;
    };
    // `load` and `key` are new each render; the values inside `key` are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const state: AsyncState<T> = result && sameValues(result.key, key) ? result.state : { status: 'loading' };
  return { ...state, retry };
}

function sameValues(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  // Not an expected API failure (likely a bug): keep the details for developers.
  console.error(error);
  return 'Something went wrong. Please try again.';
}
