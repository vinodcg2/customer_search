import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCustomer, makePage } from '../test/fixtures';

import { buildSearchUrl, searchCustomers } from './customerApi';
import { ApiError, isAbortError } from './errors';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function respondWith(body: unknown, status = 200): void {
  fetchMock.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
}

describe('buildSearchUrl', () => {
  it('omits an empty query and the "all" status filter', () => {
    expect(buildSearchUrl({ query: '', status: 'all', page: 1, pageSize: 10 })).toBe(
      '/api/customers?page=1&pageSize=10',
    );
  });

  it('includes and encodes the query, status and page', () => {
    expect(buildSearchUrl({ query: 'ann lee', status: 'pending', page: 2, pageSize: 25 })).toBe(
      '/api/customers?query=ann+lee&status=pending&page=2&pageSize=25',
    );
  });
});

describe('searchCustomers', () => {
  const params = { query: '', status: 'all', page: 1, pageSize: 10 } as const;

  it('requests the built URL with the caller’s abort signal and returns the validated page', async () => {
    const page = makePage([makeCustomer()], { total: 1 });
    respondWith(page);
    const controller = new AbortController();

    const result = await searchCustomers(params, controller.signal);

    expect(result).toEqual(page);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(buildSearchUrl(params));
    expect(init?.signal).toBe(controller.signal);
  });

  it('throws an ApiError carrying the status for non-2xx responses', async () => {
    respondWith({ message: 'down' }, 503);

    const error = await searchCustomers(params, new AbortController().signal).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error instanceof ApiError ? error.status : undefined).toBe(503);
  });

  it('rejects a response whose shape is not a page of customers', async () => {
    respondWith({ items: [{ id: 1 }], total: 'many' });

    await expect(searchCustomers(params, new AbortController().signal)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('rejects a customer with an unknown status', async () => {
    respondWith({ ...makePage([]), items: [{ ...makeCustomer(), status: 'archived' }], total: 1 });

    await expect(searchCustomers(params, new AbortController().signal)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('lets an abort rejection through untouched so callers can ignore it', async () => {
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const error = await searchCustomers(params, new AbortController().signal).catch(
      (caught: unknown) => caught,
    );

    expect(isAbortError(error)).toBe(true);
  });
});
