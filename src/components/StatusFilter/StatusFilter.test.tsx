import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StatusFilter } from './StatusFilter';

describe('StatusFilter', () => {
  it('is a labelled group of All, Active, Inactive and Pending options', () => {
    render(<StatusFilter value="all" onChange={vi.fn()} />);

    const group = screen.getByRole('group', { name: 'Status' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'all',
      'active',
      'inactive',
      'pending',
    ]);
    for (const name of ['All', 'Active', 'Inactive', 'Pending']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
  });

  it('checks only the option matching the value', () => {
    render(<StatusFilter value="inactive" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Inactive' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Active' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pending' })).not.toBeChecked();
  });

  it('reports the chosen status', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string) => void>();
    render(<StatusFilter value="all" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Pending' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('pending');
  });

  it('can be operated with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string) => void>();
    render(<StatusFilter value="all" onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'All' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith('active');
  });
});
