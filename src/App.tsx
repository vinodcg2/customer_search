import { CustomerDashboard } from './components/CustomerDashboard/CustomerDashboard';

import './App.scss';

export function App() {
  return (
    <main className="app">
      <h1 className="app__title">Customer Search Dashboard</h1>
      <p className="app__intro">
        Search and filter a fictional customer list. Data comes from an in-memory mock API.
      </p>
      <CustomerDashboard />
    </main>
  );
}
