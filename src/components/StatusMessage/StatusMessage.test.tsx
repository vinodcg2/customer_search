import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StatusMessage } from './StatusMessage';

describe('StatusMessage', () => {
  it('shows a loading message without an alert or retry button', () => {
    render(<StatusMessage variant="loading" title="Loading customers…" />);

    expect(screen.getByText('Loading customers…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an empty message with guidance', () => {
    render(<StatusMessage variant="empty" title="No customers found" message="Try a different search." />);

    expect(screen.getByText('No customers found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('announces errors as an alert and offers a retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <StatusMessage variant="error" title="We couldn’t load customers" message="Server down." onRetry={onRetry} />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load customers');
    expect(alert).toHaveTextContent('Server down.');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
