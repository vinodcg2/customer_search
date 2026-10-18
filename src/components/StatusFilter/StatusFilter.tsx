import { useId } from 'react';

import { CUSTOMER_STATUSES } from '../../types/customer';
import type { StatusFilterValue } from '../../types/customer';
import { STATUS_LABELS } from '../statusLabels';

import './StatusFilter.scss';

interface StatusFilterProps {
  readonly value: StatusFilterValue;
  readonly onChange: (value: StatusFilterValue) => void;
}

interface FilterOption {
  readonly value: StatusFilterValue;
  readonly label: string;
}

const OPTIONS: readonly FilterOption[] = [
  { value: 'all', label: 'All' },
  ...CUSTOMER_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const groupName = useId();

  return (
    <fieldset className="status-filter">
      <legend className="status-filter__legend">Status</legend>
      <div className="status-filter__options">
        {OPTIONS.map((option) => (
          <label key={option.value} className="status-filter__option">
            <input
              className="status-filter__input"
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className="status-filter__label">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
