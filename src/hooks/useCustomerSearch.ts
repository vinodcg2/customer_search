import { useCallback, useEffect, useReducer, useState } from 'react';

import { searchCustomers } from '../api/customerApi';
import { isAbortError } from '../api/errors';
import type { Customer, PagedResult, StatusFilterValue } from '../types/customer';

import { useDebouncedValue } from './useDebouncedValue';

export type SearchState =
  /** `data` holds the previous results (if any) so the UI can keep showing them while refetching. */
  | { readonly loadState: 'loading'; readonly data: PagedResult<Customer> | null }
  | { readonly loadState: 'success'; readonly data: PagedResult<Customer> }
  | { readonly loadState: 'error'; readonly error: unknown };

type SearchAction =
  | { readonly type: 'request' }
  | { readonly type: 'success'; readonly data: PagedResult<Customer> }
  | { readonly type: 'failure'; readonly error: unknown };

const INITIAL_STATE: SearchState = { loadState: 'loading', data: null };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'request':
      if (state.loadState === 'loading') {
        return state;
      }
      return { loadState: 'loading', data: state.loadState === 'success' ? state.data : null };
    case 'success':
      return { loadState: 'success', data: action.data };
    case 'failure':
      return { loadState: 'error', error: action.error };
  }
}

export interface UseCustomerSearchOptions {
  /** The live, un-debounced text from the input. */
  readonly query: string;
  readonly status: StatusFilterValue;
  readonly pageSize: number;
  readonly debounceMs: number;
}

export interface CustomerSearch {
  readonly state: SearchState;
  readonly page: number;
  readonly totalPages: number;
  readonly setPage: (page: number) => void;
  /** Re-issues the current request, e.g. after an error. */
  readonly retry: () => void;
}

/**
 * Owns everything between "the user changed a filter" and "results are on screen":
 * debouncing, paging, fetching, cancellation and stale-response protection.
 */
export function useCustomerSearch({
  query,
  status,
  pageSize,
  debounceMs,
}: UseCustomerSearchOptions): CustomerSearch {
  const [state, dispatch] = useReducer(searchReducer, INITIAL_STATE);
  const [retryCount, setRetryCount] = useState(0);

  // Trim before debouncing so "ann" and "ann " are the same search.
  const debouncedQuery = useDebouncedValue(query.trim(), debounceMs);

  // The page only means something for the criteria it was chosen under. Storing
  // those criteria next to it lets us fall back to page 1 *during render*
  // whenever they change, instead of resetting in an effect. An effect would
  // first render (and fetch) the new criteria with the old page.
  const criteriaKey = `${status}|${debouncedQuery}`;
  const [pageState, setPageState] = useState({ page: 1, criteriaKey });
  let page = pageState.page;
  if (pageState.criteriaKey !== criteriaKey) {
    setPageState({ page: 1, criteriaKey });
    page = 1;
  }

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState({ page: Math.max(1, nextPage), criteriaKey });
    },
    [criteriaKey],
  );

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Identity of *this* request. The cleanup below flips it when the request is
    // superseded or the component unmounts, so a late response can never be
    // committed, whether or not the transport honoured the abort.
    let isCurrent = true;

    dispatch({ type: 'request' });

    searchCustomers({ query: debouncedQuery, status, page, pageSize }, controller.signal).then(
      (data) => {
        if (isCurrent) {
          dispatch({ type: 'success', data });
        }
      },
      (error: unknown) => {
        // A cancelled request is expected, not a failure.
        if (isCurrent && !isAbortError(error)) {
          dispatch({ type: 'failure', error });
        }
      },
    );

    return () => {
      isCurrent = false;
      controller.abort();
    };
    // retryCount is intentionally a dependency: bumping it re-runs the request.
  }, [debouncedQuery, status, page, pageSize, retryCount]);

  const total = state.loadState === 'error' ? 0 : (state.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { state, page, totalPages, setPage, retry };
}
