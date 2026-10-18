import type { Customer, CustomerStatus } from '../../types/customer';

// Entirely fictional data. Email domains use the reserved ".example" TLD.
const FIRST_NAMES = [
  'Amelia', 'Rohan', 'Priya', 'Marcus', 'Elena', 'Tomasz',
  'Yuki', 'Fatima', 'Liam', 'Sofia', 'Kwame', 'Ingrid',
] as const;

const LAST_NAMES = [
  'Okafor', 'Lindqvist', 'Navarro', 'Banerjee',
  'Whitfield', 'Tanaka', 'Moreau', 'Castellanos',
] as const;

const COMPANIES = [
  'Alder & Finch', 'Bluepeak Logistics', 'Cedarline Foods', 'Driftwood Analytics',
  'Everbright Energy', 'Foxglove Health', 'Granite Harbour Capital', 'Halcyon Robotics',
] as const;

// Repeats every 6 customers: 3 active, 2 pending, 1 inactive.
const STATUS_CYCLE: readonly CustomerStatus[] = [
  'active', 'active', 'pending', 'inactive', 'active', 'pending',
];

export const CUSTOMER_COUNT = 48;

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error('pick() called with an empty list');
  }
  return item;
}

function buildCustomer(index: number): Customer {
  const first = pick(FIRST_NAMES, index);
  // Offsetting by the "block" of 12 keeps every first/last pair unique.
  const last = pick(LAST_NAMES, index + Math.floor(index / FIRST_NAMES.length));
  const company = pick(COMPANIES, index * 3);
  const domain = company.toLowerCase().replace(/[^a-z]/g, '');
  const joined = new Date(Date.UTC(2021, 0, 1 + index * 17));

  return {
    id: `cus_${String(index + 1).padStart(3, '0')}`,
    name: `${first} ${last}`,
    email: `${first}.${last}@${domain}.example`.toLowerCase(),
    company,
    status: pick(STATUS_CYCLE, index),
    joinedAt: joined.toISOString().slice(0, 10),
  };
}

/** Deterministic dataset, sorted by name (the order the mock API returns). */
export const CUSTOMERS: readonly Customer[] = Array.from({ length: CUSTOMER_COUNT }, (_, index) =>
  buildCustomer(index),
).sort((a, b) => a.name.localeCompare(b.name));
