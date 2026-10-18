import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { createMockFetch, MOCK_ERROR_QUERY } from '../../api/mock/mockFetch';
import type { FetchFn } from '../../api/mock/mockFetch';
import { createDeferred } from '../../test/deferred';

import { CustomerDashboard } from './CustomerDashboard';

const TABLE_NAME = 'Customer search results';

// Fast, deterministic backend. Individual tests wrap or replace it.
const instantBackend = createMockFetch({ latencyMs: 0 });

let fetchSpy: Mock<FetchFn>;

beforeEach(() => {
  fetchSpy = vi.fn<FetchFn>(instantBackend);
  vi.stubGlobal('fetch', fetchSpy);
});

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

function requestedUrls(): string[] {
  return fetchSpy.mock.calls.map(([input]) => urlOf(input));
}

async function renderLoaded(props: { debounceMs?: number } = {}) {
  render(<CustomerDashboard debounceMs={props.debounceMs ?? 50} pageSize={10} />);
  const table = await screen.findByRole('table', { name: TABLE_NAME });
  return { table, user: userEvent.setup() };
}

describe('CustomerDashboard: loading and results', () => {
  it('shows a loading state, then the first page of customers', async () => {
    render(<CustomerDashboard debounceMs={50} pageSize={10} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading customers…');

    const table = await screen.findByRole('table', { name: TABLE_NAME });
    expect(within(table).getAllByRole('row')).toHaveLength(11); // header + 10
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–10 of 48 customers');
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
  });
});

describe('CustomerDashboard: debounced search', () => {
  it('sends one request for a burst of typing, using the final text', async () => {
    const { user } = await renderLoaded({ debounceMs: 250 });
    fetchSpy.mockClear();

    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'foxglove');

    await screen.findByText('Showing 1–6 of 6 customers');
    expect(requestedUrls()).toHaveLength(1);
    expect(requestedUrls()[0]).toContain('query=foxglove');
  });
});

describe('CustomerDashboard: status filter', () => {
  it('filters by status and shows only matching customers', async () => {
    const { user } = await renderLoaded();

    await user.click(screen.getByRole('radio', { name: 'Pending' }));

    await screen.findByText('Showing 1–10 of 16 customers');
    const table = screen.getByRole('table', { name: TABLE_NAME });
    expect(within(table).getAllByText('Pending')).toHaveLength(10);
    expect(within(table).queryByText('Active')).not.toBeInTheDocument();
    expect(within(table).queryByText('Inactive')).not.toBeInTheDocument();
  });

  it('combines the status filter with the text search', async () => {
    const { user } = await renderLoaded();

    await user.type(screen.getByRole('searchbox'), 'amelia');
    await screen.findByText('Showing 1–4 of 4 customers');
    await user.click(screen.getByRole('radio', { name: 'Inactive' }));

    expect(await screen.findByText('No customers found')).toBeInTheDocument();
  });
});

describe('CustomerDashboard: pagination', () => {
  it('moves forward and back and updates the summary', async () => {
    const { user } = await renderLoaded();
    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Showing 11–20 of 48 customers');
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(previous).toHaveAttribute('aria-disabled', 'false');

    await user.click(previous);
    await screen.findByText('Showing 1–10 of 48 customers');
    expect(previous).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a short last page and disables Next there', async () => {
    const { user } = await renderLoaded();
    const next = screen.getByRole('button', { name: 'Next page' });

    for (let page = 2; page <= 5; page += 1) {
      await user.click(next);
      await screen.findByText(`Page ${String(page)} of 5`);
    }

    await screen.findByText('Showing 41–48 of 48 customers');
    expect(next).toHaveAttribute('aria-disabled', 'true');
  });

  it('returns to page 1 when the status filter changes, without requesting the old page', async () => {
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Page 2 of 5');
    fetchSpy.mockClear();

    await user.click(screen.getByRole('radio', { name: 'Pending' }));

    await screen.findByText('Page 1 of 2');
    expect(requestedUrls().every((url) => url.includes('page=1'))).toBe(true);
    expect(requestedUrls().some((url) => url.includes('page=2'))).toBe(false);
  });

  it('returns to page 1 when the search text changes', async () => {
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Page 2 of 5');
    fetchSpy.mockClear();

    await user.type(screen.getByRole('searchbox'), 'a');

    await waitFor(() => {
      expect(requestedUrls()).toHaveLength(1);
    });
    expect(requestedUrls()[0]).toContain('page=1');
    expect(screen.queryByText('Page 2 of 5')).not.toBeInTheDocument();
  });
});

describe('CustomerDashboard: empty state', () => {
  it('explains when nothing matches and hides pagination', async () => {
    const { user } = await renderLoaded();

    await user.type(screen.getByRole('searchbox'), 'zzzz-no-match');

    expect(await screen.findByText('No customers found')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No customers found.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});

describe('CustomerDashboard: errors and retry', () => {
  it('shows an alert when the server fails, and recovers with "Try again"', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'down' }), { status: 503 })),
    );
    const user = userEvent.setup();
    render(<CustomerDashboard debounceMs={50} pageSize={10} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load customers');
    expect(alert).toHaveTextContent('The server ran into a problem');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table', { name: TABLE_NAME })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('reports a network failure with its own message', async () => {
    fetchSpy.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<CustomerDashboard debounceMs={50} pageSize={10} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach the server');
  });

  it('surfaces the mock API’s simulated server error for a search', async () => {
    const { user } = await renderLoaded();

    await user.type(screen.getByRole('searchbox'), MOCK_ERROR_QUERY);

    expect(await screen.findByRole('alert')).toHaveTextContent('The server ran into a problem');
  });

  it('keeps retrying the same search, and clears the error when the search changes', async () => {
    const { user } = await renderLoaded();
    const searchbox = screen.getByRole('searchbox');
    await user.type(searchbox, MOCK_ERROR_QUERY);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument(); // still failing: same query

    await user.clear(searchbox);
    expect(await screen.findByRole('table', { name: TABLE_NAME })).toBeInTheDocument();
  });
});

describe('CustomerDashboard: request cancellation', () => {
  it('aborts the in-flight request when the search changes', async () => {
    const slowBackend = createMockFetch({ latencyMs: 300 });
    const signals: AbortSignal[] = [];
    fetchSpy.mockImplementation((input, init) => {
      if (init?.signal) {
        signals.push(init.signal);
      }
      return slowBackend(input, init);
    });
    const user = userEvent.setup();
    render(<CustomerDashboard debounceMs={50} pageSize={10} />);

    await user.type(screen.getByRole('searchbox'), 'f');

    await waitFor(() => {
      expect(signals).toHaveLength(2);
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    await screen.findByRole('table', { name: TABLE_NAME });
  });
});

describe('CustomerDashboard: out-of-order responses', () => {
  it('keeps the newest results when a slower, older response arrives last', async () => {
    const { user } = await renderLoaded();
    const releaseSlowResponse = createDeferred<void>();

    // The "amelia, any status" search is answered slowly and ignores cancellation,
    // like a server (or proxy) that cannot be interrupted.
    fetchSpy.mockImplementation(async (input) => {
      const url = urlOf(input);
      const isSlowSearch = url.includes('query=amelia') && !url.includes('status=');
      const response = await instantBackend(input);
      if (isSlowSearch) {
        await releaseSlowResponse.promise;
      }
      return response;
    });

    // 1. Slow request starts: 4 Amelias, all active.
    await user.type(screen.getByRole('searchbox'), 'amelia');
    await waitFor(() => {
      expect(requestedUrls().some((url) => url.includes('query=amelia'))).toBe(true);
    });

    // 2. Newer request starts before the slow one finishes: Amelias who are inactive (none).
    await user.click(screen.getByRole('radio', { name: 'Inactive' }));
    expect(await screen.findByText('No customers found')).toBeInTheDocument();

    // 3. The slow, now-obsolete response finally arrives.
    await act(async () => {
      releaseSlowResponse.resolve();
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    });

    // The UI must still reflect the newest request.
    expect(screen.getByText('No customers found')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
