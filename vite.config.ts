import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// One config for both the app (Vite) and the tests (Vitest).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Prevent state leaking between tests.
    restoreMocks: true,
    unstubGlobals: true,
  },
});
