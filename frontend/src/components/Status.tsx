import type { ReactNode } from 'react';
import type { AsyncState } from '../hooks/useAsync';

interface StatusProps<T> {
  state: AsyncState<T> & { retry: () => void };
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}

/** Shows loading, a friendly error with "Try again", or the loaded content. */
export function Status<T>({ state, loadingLabel = 'Loading…', children }: StatusProps<T>) {
  if (state.status === 'loading') {
    return (
      <p className="status" role="status">
        {loadingLabel}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="status status--error" role="alert">
        <p>{state.message}</p>
        <button type="button" className="button button--secondary" onClick={state.retry}>
          Try again
        </button>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
