import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchBox } from './SearchBox';

function StatefulSearchBox() {
  const [value, setValue] = useState('');
  return <SearchBox value={value} onChange={setValue} />;
}

describe('SearchBox', () => {
  it('exposes a labelled search field inside a search landmark', () => {
    render(<SearchBox value="" onChange={vi.fn()} />);

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search customers' })).toBeInTheDocument();
  });

  it('describes the field with its hint', () => {
    render(<SearchBox value="" onChange={vi.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveAccessibleDescription('Results update as you type.');
  });

  it('shows the value it is given', () => {
    render(<SearchBox value="ann" onChange={vi.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('ann');
  });

  it('reports what the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string) => void>();
    render(<SearchBox value="" onChange={onChange} />);

    await user.type(screen.getByRole('searchbox'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('accumulates typed text when the parent owns the state', async () => {
    const user = userEvent.setup();
    render(<StatefulSearchBox />);

    await user.type(screen.getByRole('searchbox'), 'ann');

    expect(screen.getByRole('searchbox')).toHaveValue('ann');
  });

  it('does not submit the form (and reload the page) on Enter', () => {
    render(<SearchBox value="" onChange={vi.fn()} />);

    const notCancelled = fireEvent.submit(screen.getByRole('search'));

    expect(notCancelled).toBe(false);
  });
});
