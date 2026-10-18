export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * True for the error produced when a request is cancelled with an AbortController.
 *
 * Duck-typed on purpose: the concrete class differs between browsers, Node's
 * fetch and jsdom (`DOMException` vs `Error`), but the `name` is consistent.
 */
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

/** Turns any thrown value into a message that is safe and useful to show a user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status !== undefined && error.status >= 500) {
      return 'The server ran into a problem. Please try again.';
    }
    return 'The request could not be completed.';
  }
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when the network is unreachable.
    return 'We could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
