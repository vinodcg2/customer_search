import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { installMockApi } from './api/mock/installMockApi';
import './styles/main.scss';

// There is no backend: serve /api/customers from the in-memory mock.
installMockApi();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
