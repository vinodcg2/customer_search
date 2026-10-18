import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchCustomers } from '../api/customerApi';
import { ApiError } from '../api/errors';
import { createDeferred } from '../test/deferred';
import type { Deferred } from '../test/deferred';
import { makeCustomer, makePage } from '../test/fixtures';
import type { Customer, PagedResult, SearchParams } from '../types/customer';

import { useCustomerSearch } from './useCustomerSearch';
import type { SearchState, UseCustomerSearchOptions } from './useCustomerSearch';

vi.mock('../api/customerApi', () => ({ searchCustomers: vi.fn() }));

const searchMock = vi.mocked(searchCustomers);

interface RecordedRequest {
  readonly params: SearchParams;
  readonly signal: AbortSignal;
  readonly deferred: Deferred<PagedResult<Customer>>;
}

const BASE_OPTIONS: UseCustomerSearchOptions = {
  query: '',
  status: 'all',
  pageSize: 10,
  debounceMs: 300,
};

let requests: RecordedRequest[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  requests = [];
  searchMock.mockReset();
  // Every call is recorded and stays pending until the test settles it, which
  // lets tests decide the order in which responses arrive.
  searchMock.mockImplementation((params, signal) => {
    const deferred = createDeferred<PagedResult<Customer>>();
    requests.push({ params, signal, deferred });
    return deferred.promise;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function request(index: number): RecordedRequest {
  const found = requests[index];
  if (found === undefined) {
    throw new Error(`Expected request #${String(index)} to have been made`);
  }
  return found;
}

function lastRequest(): RecordedRequest {
  return request(requests.length - 1);
}

async function resolveRequest(target: RecordedRequest, data: PagedResult<Customer>): Promise<void> {
  await act(() => {
    target.deferred.resolve(data);
    return Promise.resolve();
  });
}

async function rejectRequest(target: RecordedRequest, error: unknown): Promise<void> {
  await act(() => {
    target.deferred.reject(error);
    return Promise.resolve();
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function dataOf(state: SearchState): PagedResult<Customer> | null {
  return state.loadState === 'error' ? null : state.data;
}

/** A page whose single customer is identifiable by `label`. */
function pageWith(label: string, overrides: Partial<PagedResult<Customer>> = {}): PagedResult<Customer> {
  return makePage([makeCustomer({ id: label, name: label })], overrides);
}

function setup(initial: Partial<UseCustomerSearchOptions> = {}) {
  let current: UseCustomerSearchOptions = { ...BASE_OPTIONS, ...initial };
  const hook = renderHook((props: UseCustomerSearchOptions) => useCustomerSearch(props), {
    initialProps: current,
  });
  const update = (patch: Partial<UseCustomerSearchOptions>): void => {
    current = { ...current, ...patch };
    hook.rerender(current);
  };
  return { ...hook, update };
}

/** Loads page 1, then navigates to `page`, leaving everything resolved. */
async function setupOnPage(page: number, initial: Partial<UseCustomerSearchOptions> = {}) {
  const harness = setup(initial);
  await resolveRequest(request(0), pageWith('first', { total: 100 }));
  act(() => {
    harness.result.current.setPage(page);
  });
  await resolveRequest(lastRequest(), pageWith(`page-${String(page)}`, { total: 100, page }));
  return harness;
}

describe('initial load', () => {
  it('requests page 1 immediately, without waiting for the debounce', () => {
    const { result } = setup();

    expect(requests).toHaveLength(1);
    expect(request(0).params).toEqual({ query: '', status: 'all', page: 1, pageSize: 10 });
    expect(result.current.state).toEqual({ loadState: 'loading', data: null });
  });

  it('exposes the results and the page count once the request succeeds', async () => {
    const { result } = setup();
    const page = pageWith('alice', { total: 25 });

    await resolveRequest(request(0), page);

    expect(result.current.state).toEqual({ loadState: 'success', data: page });
    expect(result.current.totalPages).toBe(3);
  });

  it('reports at least one page when there are no results', async () => {
    const { result } = setup();

    await resolveRequest(request(0), makePage([], { total: 0 }));

    expect(result.current.totalPages).toBe(1);
  });
});

describe('debounced search', () => {
  it('does not search while the user is still typing', () => {
    const { update } = setup();

    update({ query: 'a' });
    advance(100);
    update({ query: 'an' });
    advance(100);
    update({ query: 'ann' });
    advance(299);

    expect(requests).toHaveLength(1);
  });

  it('searches once, with the final text, when typing stops', () => {
    const { update } = setup();

    update({ query: 'a' });
    advance(100);
    update({ query: 'ann' });
    advance(300);

    expect(requests).toHaveLength(2);
    expect(lastRequest().params.query).toBe('ann');
  });

  it('trims the query, so surrounding whitespace never triggers a search', () => {
    const { update } = setup();

    update({ query: '  ann  ' });
    advance(300);
    expect(lastRequest().params.query).toBe('ann');
    expect(requests).toHaveLength(2);

    update({ query: 'ann ' });
    advance(300);
    expect(requests).toHaveLength(2);
  });

  it('applies the status filter immediately, without debouncing', () => {
    const { update } = setup();

    update({ status: 'pending' });

    expect(requests).toHaveLength(2);
    expect(lastRequest().params.status).toBe('pending');
  });
});

describe('request cancellation', () => {
  it('aborts the in-flight request when the criteria change', () => {
    const { update } = setup();
    expect(request(0).signal.aborted).toBe(false);

    update({ status: 'active' });

    expect(request(0).signal.aborted).toBe(true);
    expect(request(1).signal.aborted).toBe(false);
  });

  it('aborts the in-flight request when the page changes', async () => {
    const { result } = setup();
    await resolveRequest(request(0), pageWith('first', { total: 100 }));
    act(() => {
      result.current.setPage(2);
    });
    const secondPageRequest = lastRequest();

    act(() => {
      result.current.setPage(3);
    });

    expect(secondPageRequest.signal.aborted).toBe(true);
  });

  it('aborts the in-flight request on unmount', () => {
    const { unmount } = setup();

    unmount();

    expect(request(0).signal.aborted).toBe(true);
  });
});

describe('stale responses', () => {
  // These deliberately settle requests that were already aborted. The mock
  // ignores the signal, like a transport that cannot cancel, so they prove the
  // hook does not depend on abort() actually stopping the response.
  it('ignores a slow earlier response that arrives after a newer one', async () => {
    const { result, update } = setup();
    const slow = request(0);
    update({ status: 'active' });
    const fast = lastRequest();
    const newer = pageWith('newer');

    await resolveRequest(fast, newer);
    await resolveRequest(slow, pageWith('older'));

    expect(result.current.state).toEqual({ loadState: 'success', data: newer });
  });

  it('does not let a stale response end the loading state of the newer request', async () => {
    const { result, update } = setup();
    const slow = request(0);
    update({ status: 'active' });

    await resolveRequest(slow, pageWith('older'));

    expect(result.current.state.loadState).toBe('loading');
    expect(dataOf(result.current.state)).toBeNull();
  });

  it('ignores a stale failure', async () => {
    const { result, update } = setup();
    const slow = request(0);
    update({ status: 'active' });
    const fast = lastRequest();
    const newer = pageWith('newer');
    await resolveRequest(fast, newer);

    await rejectRequest(slow, new ApiError('late failure', 500));

    expect(result.current.state).toEqual({ loadState: 'success', data: newer });
  });

  it('never commits a response that arrives after unmount', async () => {
    const { result, unmount } = setup();
    unmount();

    await resolveRequest(request(0), pageWith('late'));

    expect(result.current.state.loadState).toBe('loading');
  });

  it('does not treat an abort rejection as an error', async () => {
    const { result } = setup();

    await rejectRequest(request(0), new DOMException('Aborted', 'AbortError'));

    expect(result.current.state.loadState).toBe('loading');
  });
});

describe('pagination', () => {
  it('requests the chosen page and keeps the previous rows visible while it loads', async () => {
    const { result } = setup();
    const firstPage = pageWith('first', { total: 100 });
    await resolveRequest(request(0), firstPage);

    act(() => {
      result.current.setPage(2);
    });

    expect(lastRequest().params.page).toBe(2);
    expect(result.current.page).toBe(2);
    expect(result.current.state).toEqual({ loadState: 'loading', data: firstPage });

    const secondPage = pageWith('second', { total: 100, page: 2 });
    await resolveRequest(lastRequest(), secondPage);
    expect(result.current.state).toEqual({ loadState: 'success', data: secondPage });
  });

  it('never goes below page 1', async () => {
    const { result } = setup();
    await resolveRequest(request(0), pageWith('first', { total: 100 }));

    act(() => {
      result.current.setPage(-4);
    });

    expect(result.current.page).toBe(1);
  });

  it('resets to page 1 when the status filter changes, without requesting the old page', async () => {
    const { result, update } = await setupOnPage(3);
    expect(result.current.page).toBe(3);
    const before = requests.length;

    update({ status: 'inactive' });

    expect(result.current.page).toBe(1);
    const newRequests = requests.slice(before);
    expect(newRequests).toHaveLength(1);
    expect(newRequests[0]?.params).toMatchObject({ status: 'inactive', page: 1 });
  });

  it('resets to page 1 when the debounced query changes, but not before it settles', async () => {
    const { result, update } = await setupOnPage(2);
    const before = requests.length;

    update({ query: 'x' });
    advance(299);
    expect(result.current.page).toBe(2);
    expect(requests).toHaveLength(before);

    advance(1);
    expect(result.current.page).toBe(1);
    const newRequests = requests.slice(before);
    expect(newRequests).toHaveLength(1);
    expect(newRequests[0]?.params).toMatchObject({ query: 'x', page: 1 });
  });

  it('does not resurrect an old page when the criteria return to a previous value', async () => {
    const { result, update } = await setupOnPage(2);

    update({ status: 'active' });
    update({ status: 'all' });

    expect(result.current.page).toBe(1);
    expect(lastRequest().params).toMatchObject({ status: 'all', page: 1 });
  });
});

describe('errors and retry', () => {
  it('exposes the failure', async () => {
    const { result } = setup();
    const failure = new ApiError('boom', 500);

    await rejectRequest(request(0), failure);

    expect(result.current.state).toEqual({ loadState: 'error', error: failure });
  });

  it('retry re-issues the same request and recovers on success', async () => {
    const { result } = setup({ query: 'ann' });
    advance(300);
    expect(requests).toHaveLength(1);
    await rejectRequest(request(0), new ApiError('boom', 500));
    expect(result.current.state.loadState).toBe('error');

    act(() => {
      result.current.retry();
    });

    expect(requests).toHaveLength(2);
    expect(request(1).params).toEqual(request(0).params);
    expect(result.current.state).toEqual({ loadState: 'loading', data: null });

    const page = pageWith('ann');
    await resolveRequest(request(1), page);
    expect(result.current.state).toEqual({ loadState: 'success', data: page });
  });

  it('can fail and be retried more than once', async () => {
    const { result } = setup();

    await rejectRequest(request(0), new ApiError('first', 500));
    act(() => {
      result.current.retry();
    });
    await rejectRequest(request(1), new ApiError('second', 500));
    expect(result.current.state.loadState).toBe('error');

    act(() => {
      result.current.retry();
    });
    await resolveRequest(request(2), pageWith('ok'));

    expect(result.current.state.loadState).toBe('success');
  });
});
