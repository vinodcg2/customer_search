import { describe, expect, it } from 'vitest';

import { ApiError, getErrorMessage, isAbortError } from './errors';

describe('isAbortError', () => {
  it('recognises a DOMException named AbortError', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
  });

  it('recognises any error object named AbortError (cross-realm safe)', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    expect(isAbortError(error)).toBe(true);
  });

  it('rejects other errors and non-objects', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('describes server errors', () => {
    expect(getErrorMessage(new ApiError('x', 503))).toMatch(/server ran into a problem/i);
  });

  it('describes other API errors', () => {
    expect(getErrorMessage(new ApiError('x', 400))).toMatch(/could not be completed/i);
    expect(getErrorMessage(new ApiError('bad shape'))).toMatch(/could not be completed/i);
  });

  it('describes network failures', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toMatch(/could not reach the server/i);
  });

  it('falls back to a generic message', () => {
    expect(getErrorMessage('???')).toMatch(/something went wrong/i);
  });
});
