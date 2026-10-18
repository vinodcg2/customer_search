import { describe, expect, it } from 'vitest';

import { parseCustomerPage } from '../parseCustomerPage';

import { CUSTOMER_COUNT, CUSTOMERS } from './customers';
import { createMockFetch, MOCK_ERROR_QUERY } from './mockFetch';

const mockFetch = createMockFetch({ latencyMs: 0 });

async function fetchPage(search: string) {
  const response = await mockFetch(`/api/customers${search}`);
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  return parseCustomerPage(body);
}

function countByStatus(status: string): number {
  return CUSTOMERS.filter((customer) => customer.status === status).length;
}

describe('mock customer dataset', () => {
  it('is deterministic, unique and covers every status', () => {
    expect(CUSTOMERS).toHaveLength(CUSTOMER_COUNT);
    expect(new Set(CUSTOMERS.map((c) => c.id)).size).toBe(CUSTOMER_COUNT);
    expect(new Set(CUSTOMERS.map((c) => c.name)).size).toBe(CUSTOMER_COUNT);
    expect(new Set(CUSTOMERS.map((c) => c.email)).size).toBe(CUSTOMER_COUNT);
    expect(countByStatus('active')).toBe(24);
    expect(countByStatus('pending')).toBe(16);
    expect(countByStatus('inactive')).toBe(8);
  });
});

describe('mock customers API', () => {
  it('returns the first page sorted by name with the overall total', async () => {
    const page = await fetchPage('');

    expect(page.total).toBe(CUSTOMER_COUNT);
    expect(page.items).toHaveLength(10);
    const names = page.items.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('paginates, including a short last page and an empty page past the end', async () => {
    const last = await fetchPage('?page=5&pageSize=10');
    expect(last.items).toHaveLength(8);
    expect(last.page).toBe(5);

    const beyond = await fetchPage('?page=6&pageSize=10');
    expect(beyond.items).toHaveLength(0);
    expect(beyond.total).toBe(CUSTOMER_COUNT);
  });

  it('does not repeat or skip customers across pages', async () => {
    const ids: string[] = [];
    for (let page = 1; page <= 5; page += 1) {
      ids.push(...(await fetchPage(`?page=${String(page)}`)).items.map((c) => c.id));
    }
    expect(new Set(ids).size).toBe(CUSTOMER_COUNT);
  });

  it.each(['active', 'inactive', 'pending'] as const)('filters by the %s status', async (status) => {
    const page = await fetchPage(`?status=${status}&pageSize=50`);

    expect(page.total).toBe(countByStatus(status));
    expect(page.items.every((c) => c.status === status)).toBe(true);
  });

  it('searches name, email and company case-insensitively', async () => {
    const byCompany = await fetchPage('?query=FOXGLOVE&pageSize=50');
    expect(byCompany.total).toBe(6);
    expect(byCompany.items.every((c) => c.company === 'Foxglove Health')).toBe(true);

    const [target] = CUSTOMERS;
    if (target === undefined) {
      throw new Error('dataset is empty');
    }
    const byEmail = await fetchPage(`?query=${encodeURIComponent(target.email.toUpperCase())}`);
    expect(byEmail.items.map((c) => c.id)).toEqual([target.id]);
  });

  it('combines text search and status filter', async () => {
    const page = await fetchPage('?query=amelia&status=inactive');
    expect(page.total).toBe(0);

    const active = await fetchPage('?query=amelia&status=active');
    expect(active.total).toBe(4);
  });

  it('returns an empty page when nothing matches', async () => {
    const page = await fetchPage('?query=zzzz-no-match');
    expect(page).toMatchObject({ items: [], total: 0 });
  });

  it('answers invalid parameters with 400', async () => {
    for (const search of ['?page=0', '?page=abc', '?pageSize=999', '?status=archived']) {
      const response = await mockFetch(`/api/customers${search}`);
      expect(response.status, search).toBe(400);
    }
  });

  it('answers unknown paths with 404', async () => {
    expect((await mockFetch('/api/nope')).status).toBe(404);
  });

  it('can simulate a server error', async () => {
    const response = await mockFetch(`/api/customers?query=${MOCK_ERROR_QUERY}`);
    expect(response.status).toBe(500);
  });

  it('honours AbortSignal while the "network" call is in flight', async () => {
    const slowFetch = createMockFetch({ latencyMs: 10_000 });
    const controller = new AbortController();

    const pending = slowFetch('/api/customers', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const slowFetch = createMockFetch({ latencyMs: 10_000 });
    const controller = new AbortController();
    controller.abort();

    await expect(slowFetch('/api/customers', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
