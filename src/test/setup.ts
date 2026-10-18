import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals are intentionally disabled, so RTL's automatic cleanup does
// not register itself. Do it explicitly.
afterEach(() => {
  cleanup();
});
