import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeCustomer } from '../../test/fixtures';

import { CustomerTable } from './CustomerTable';

function rowAt(rows: readonly HTMLElement[], index: number): HTMLElement {
  const row = rows[index];
  if (row === undefined) {
    throw new Error(`Expected a row at index ${String(index)}`);
  }
  return row;
}

const CUSTOMERS = [
  makeCustomer({ id: 'a', name: 'Amelia Okafor', company: 'Alder & Finch', status: 'active' }),
  makeCustomer({ id: 'b', name: 'Rohan Banerjee', company: 'Bluepeak Logistics', status: 'pending' }),
  makeCustomer({ id: 'c', name: 'Priya Tanaka', company: 'Cedarline Foods', status: 'inactive' }),
];

describe('CustomerTable', () => {
  it('is a named table with column headers', () => {
    render(<CustomerTable customers={CUSTOMERS} />);

    const table = screen.getByRole('table', { name: 'Customer search results' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual(['Name', 'Company', 'Email', 'Status', 'Customer since']);
  });

  it('renders one row per customer, with the name as the row header', () => {
    render(<CustomerTable customers={CUSTOMERS} />);

    const table = screen.getByRole('table');
    // +1 for the header row
    expect(within(table).getAllByRole('row')).toHaveLength(CUSTOMERS.length + 1);
    expect(within(table).getByRole('rowheader', { name: 'Amelia Okafor' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Bluepeak Logistics' })).toBeInTheDocument();
  });

  it('shows each status as text, not only as colour', () => {
    render(<CustomerTable customers={CUSTOMERS} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rowAt(rows, 1)).getByText('Active')).toBeInTheDocument();
    expect(within(rowAt(rows, 2)).getByText('Pending')).toBeInTheDocument();
    expect(within(rowAt(rows, 3)).getByText('Inactive')).toBeInTheDocument();
  });

  it('is a focusable region so keyboard users can scroll it', () => {
    render(<CustomerTable customers={CUSTOMERS} />);

    expect(screen.getByRole('region', { name: 'Customer search results' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('marks itself busy while newer results load', () => {
    const { rerender } = render(<CustomerTable customers={CUSTOMERS} />);
    const region = screen.getByRole('region');
    expect(region).not.toHaveClass('customer-table--busy');

    rerender(<CustomerTable customers={CUSTOMERS} isBusy />);

    expect(region).toHaveClass('customer-table--busy');
  });
});
