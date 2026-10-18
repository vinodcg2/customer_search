import { CUSTOMERS_ENDPOINT } from '../endpoints';

import { createMockFetch } from './mockFetch';

/**
 * Routes requests to "/api/customers" to the in-memory mock; everything else
 * goes to the real fetch. There is no backend in this project, so this is
 * installed in main.tsx for dev and production builds alike. Delete the call
 * there to talk to a real API.
 */
export function installMockApi(): void {
  const mockFetch = createMockFetch();
  const realFetch = window.fetch.bind(window);

  window.fetch = (input, init) =>
    typeof input === 'string' && input.startsWith(CUSTOMERS_ENDPOINT)
      ? mockFetch(input, init)
      : realFetch(input, init);
}
