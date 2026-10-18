import type { Customer, PagedResult } from '../types/customer';

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cus_test',
    name: 'Test Customer',
    email: 'test.customer@example.test',
    company: 'Test Co',
    status: 'active',
    joinedAt: '2024-01-15',
    ...overrides,
  };
}

export function makePage(
  items: readonly Customer[],
  overrides: Partial<PagedResult<Customer>> = {},
): PagedResult<Customer> {
  return { items, total: items.length, page: 1, pageSize: 10, ...overrides };
}
