import type { Customer, PagedResult, SearchParams } from '../../types/customer';

export function filterCustomers(
  customers: readonly Customer[],
  query: string,
  status: SearchParams['status'],
): Customer[] {
  const needle = query.trim().toLowerCase();

  return customers.filter((customer) => {
    const matchesStatus = status === 'all' || customer.status === status;
    const matchesText =
      needle === '' ||
      [customer.name, customer.email, customer.company].some((field) =>
        field.toLowerCase().includes(needle),
      );
    return matchesStatus && matchesText;
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function queryCustomers(
  customers: readonly Customer[],
  { query, status, page, pageSize }: SearchParams,
): PagedResult<Customer> {
  const matches = filterCustomers(customers, query, status);
  return {
    items: paginate(matches, page, pageSize),
    total: matches.length,
    page,
    pageSize,
  };
}
