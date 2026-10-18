import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { createMockFetch } from './api/mock/mockFetch';

beforeEach(() => {
  vi.stubGlobal('fetch', createMockFetch({ latencyMs: 0 }));
});

describe('App', () => {
  // Smoke test: proves the Vitest + jsdom + RTL + jest-dom pipeline is wired up.
  it('renders the page heading', async () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /customer search dashboard/i }),
    ).toBeInTheDocument();
    // Let the initial request settle so no state update lands after the test ends.
    await screen.findByRole('table', { name: 'Customer search results' });
  });

  it('renders the dashboard with its controls and first page of customers', async () => {
    render(<App />);

    expect(await screen.findByRole('table', { name: 'Customer search results' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search customers' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});
