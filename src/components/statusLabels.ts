import type { CustomerStatus } from '../types/customer';

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};
