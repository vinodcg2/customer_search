import type { Customer, PagedResult, SearchParams } from '../types/customer';

import { CUSTOMERS_ENDPOINT } from './endpoints';
import { ApiError } from './errors';
import { parseCustomerPage } from './parseCustomerPage';

export function buildSearchUrl(params: SearchParams): string {
  const search = new URLSearchParams();
  if (params.query !== '') {
    search.set('query', params.query);
  }
  if (params.status !== 'all') {
    search.set('status', params.status);
  }
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  return `${CUSTOMERS_ENDPOINT}?${search.toString()}`;
}

/**
 * Fetches one page of customers.
 *
 * The caller owns cancellation: pass the signal of an AbortController and the
 * returned promise rejects with an AbortError when it is aborted.
 */
export async function searchCustomers(
  params: SearchParams,
  signal: AbortSignal,
): Promise<PagedResult<Customer>> {
  const response = await fetch(buildSearchUrl(params), {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${String(response.status)}`, response.status);
  }

  const body: unknown = await response.json();
  return parseCustomerPage(body);
}
