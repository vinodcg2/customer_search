export const CUSTOMER_STATUSES = ['active', 'inactive', 'pending'] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/** What the status filter can be set to: one status, or no status filtering. */
export type StatusFilterValue = CustomerStatus | 'all';

export function isCustomerStatus(value: unknown): value is CustomerStatus {
  return CUSTOMER_STATUSES.some((status) => status === value);
}

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly status: CustomerStatus;
  /** ISO calendar date, e.g. "2023-04-18". */
  readonly joinedAt: string;
}

export interface SearchParams {
  /** Already trimmed. An empty string means "no text filter". */
  readonly query: string;
  readonly status: StatusFilterValue;
  /** 1-based. */
  readonly page: number;
  readonly pageSize: number;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  /** Total number of matches across all pages. */
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
