import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../api/client';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/**
 * The one loading/error/data pattern used by every page.
 * Re-runs `load` when `deps` change, ignores answers to out-of-date requests,
 * and offers `retry` for the error state.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    load().then(
      (data) => current && setState({ status: 'success', data }),
      (error: unknown) => current && setState({ status: 'error', message: toMessage(error) }),
    );
    return () => {
      current = false;
    };
    // `load` is a new function each render; `deps` lists what it actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, retry };
}

function toMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
