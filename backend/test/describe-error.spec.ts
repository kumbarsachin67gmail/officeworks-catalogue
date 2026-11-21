import { describe, expect, it } from 'vitest';
import { describeError } from '../src/describe-error.js';

describe('describeError', () => {
  it('includes the cause chain and error codes', () => {
    const error = new Error('Fake Store timed out after 5000 ms', {
      cause: Object.assign(new Error('This operation was aborted'), { code: 'ABORT_ERR' }),
    });

    expect(describeError(error)).toBe('Fake Store timed out after 5000 ms <- caused by: This operation was aborted [ABORT_ERR]');
  });

  it('handles things thrown that are not errors', () => {
    expect(describeError('boom')).toBe('boom');
    expect(describeError({ status: 500 })).toBe('{"status":500}');
  });
});
