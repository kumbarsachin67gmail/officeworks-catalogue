import type { ReactNode } from 'react';
import type { AsyncState } from '../hooks/useAsync';

interface StatusProps<T> {
  state: AsyncState<T> & { retry: () => void };
  loadingLabel?: string;
  /** Optional placeholder shown while loading, such as skeleton tiles. The label is still read out. */
  placeholder?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Shows loading, a friendly error with "Try again", or the loaded content. */
export function Status<T>({ state, loadingLabel = 'Loading…', placeholder, children }: StatusProps<T>) {
  if (state.status === 'loading') {
    if (placeholder) {
      return (
        <div role="status">
          <span className="visually-hidden">{loadingLabel}</span>
          {placeholder}
        </div>
      );
    }
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
