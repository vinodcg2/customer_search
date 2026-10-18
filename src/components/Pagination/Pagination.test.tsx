import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('is a labelled navigation landmark showing the current position', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('moves to the previous and next page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn<(page: number) => void>();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 4);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
  });

  it('cannot go before the first page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn<(page: number) => void>();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    const previous = screen.getByRole('button', { name: 'Previous page' });

    await user.click(previous);

    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute('aria-disabled', 'false');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('cannot go past the last page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn<(page: number) => void>();
    render(<Pagination page={5} totalPages={5} onPageChange={onPageChange} />);
    const next = screen.getByRole('button', { name: 'Next page' });

    await user.click(next);

    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('keeps unavailable buttons focusable so keyboard focus is never lost', async () => {
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);

    await user.tab();

    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled();
  });
});
