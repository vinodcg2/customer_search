import { isCustomerStatus } from '../types/customer';
import type { Customer, PagedResult } from '../types/customer';

import { ApiError } from './errors';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isCustomer(value: unknown): value is Customer {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.company === 'string' &&
    typeof value.joinedAt === 'string' &&
    isCustomerStatus(value.status)
  );
}

/**
 * Validates untrusted JSON at the network boundary so the rest of the app can
 * rely on its types without type assertions.
 */
export function parseCustomerPage(body: unknown): PagedResult<Customer> {
  if (isRecord(body)) {
    const { items, total, page, pageSize } = body;
    if (
      isArray(items) &&
      items.every(isCustomer) &&
      typeof total === 'number' &&
      typeof page === 'number' &&
      typeof pageSize === 'number'
    ) {
      return { items, total, page, pageSize };
    }
  }
  throw new ApiError('Unexpected response shape from the customers endpoint');
}
