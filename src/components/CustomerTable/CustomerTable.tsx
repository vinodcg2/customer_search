import { useId } from 'react';

import type { Customer } from '../../types/customer';
import { STATUS_LABELS } from '../statusLabels';

import './CustomerTable.scss';

interface CustomerTableProps {
  readonly customers: readonly Customer[];
  /** True while newer results are loading; the current rows stay visible but dimmed. */
  readonly isBusy?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

function formatJoinedDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

export function CustomerTable({ customers, isBusy = false }: CustomerTableProps) {
  const captionId = useId();

  return (
    // Focusable so keyboard users can scroll the table horizontally on narrow screens.
    <div
      className={isBusy ? 'customer-table customer-table--busy' : 'customer-table'}
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
    >
      <table className="customer-table__table">
        <caption id={captionId} className="visually-hidden">
          Customer search results
        </caption>
        <thead>
          <tr>
            <th className="customer-table__heading" scope="col">Name</th>
            <th className="customer-table__heading" scope="col">Company</th>
            <th className="customer-table__heading" scope="col">Email</th>
            <th className="customer-table__heading" scope="col">Status</th>
            <th className="customer-table__heading" scope="col">Customer since</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="customer-table__row">
              <th className="customer-table__cell customer-table__cell--name" scope="row">
                {customer.name}
              </th>
              <td className="customer-table__cell">{customer.company}</td>
              <td className="customer-table__cell">{customer.email}</td>
              <td className="customer-table__cell">
                <span className={`customer-table__status customer-table__status--${customer.status}`}>
                  {STATUS_LABELS[customer.status]}
                </span>
              </td>
              <td className="customer-table__cell">{formatJoinedDate(customer.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
