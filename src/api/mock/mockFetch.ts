import type { Customer, SearchParams } from '../../types/customer';
import { isCustomerStatus } from '../../types/customer';
import { CUSTOMERS_ENDPOINT } from '../endpoints';

import { CUSTOMERS } from './customers';
import { queryCustomers } from './customerQuery';

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface MockFetchOptions {
  /** Simulated network latency in ms. Default 400. */
  readonly latencyMs?: number;
  readonly customers?: readonly Customer[];
}

export const DEFAULT_LATENCY_MS = 400;
/** Searching for exactly this text makes the mock respond with HTTP 500 (handy for demoing retry). */
export const MOCK_ERROR_QUERY = 'trigger-error';

const ORIGIN = 'http://mock.local';
const MAX_PAGE_SIZE = 50;

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/** Resolves after `ms`, or rejects with an AbortError as soon as `signal` aborts. */
function delay(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(createAbortError());
      return;
    }

    function onAbort(): void {
      clearTimeout(timer);
      reject(createAbortError());
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function toUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') {
    return new URL(input, ORIGIN);
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url, ORIGIN);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readPositiveInt(raw: string | null, fallback: number): number | null {
  if (raw === null) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

function parseSearchParams(url: URL): SearchParams | null {
  const page = readPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = readPositiveInt(url.searchParams.get('pageSize'), 10);
  const status = url.searchParams.get('status') ?? 'all';

  if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return null;
  }
  if (status !== 'all' && !isCustomerStatus(status)) {
    return null;
  }
  return { query: url.searchParams.get('query') ?? '', status, page, pageSize };
}

/**
 * A deterministic, in-memory stand-in for the customers HTTP API.
 *
 * It honours AbortSignal, so cancellation behaves like a real network call.
 * Supports text search, status filtering and pagination.
 */
export function createMockFetch(options: MockFetchOptions = {}): FetchFn {
  const { latencyMs = DEFAULT_LATENCY_MS, customers = CUSTOMERS } = options;

  return async (input, init) => {
    await delay(latencyMs, init?.signal);

    const url = toUrl(input);
    if (url.pathname !== CUSTOMERS_ENDPOINT) {
      return jsonResponse({ message: 'Not found' }, 404);
    }

    const params = parseSearchParams(url);
    if (params === null) {
      return jsonResponse({ message: 'Invalid query parameters' }, 400);
    }
    if (params.query.trim() === MOCK_ERROR_QUERY) {
      return jsonResponse({ message: 'Simulated server error' }, 500);
    }

    return jsonResponse(queryCustomers(customers, params));
  };
}
