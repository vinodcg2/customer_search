import { useRef, useState } from 'react';

import { getErrorMessage } from '../../api/errors';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import type { StatusFilterValue } from '../../types/customer';
import { CustomerTable } from '../CustomerTable/CustomerTable';
import { Pagination } from '../Pagination/Pagination';
import { SearchBox } from '../SearchBox/SearchBox';
import { StatusFilter } from '../StatusFilter/StatusFilter';
import { StatusMessage } from '../StatusMessage/StatusMessage';

import { describeResults } from './describeResults';
import './CustomerDashboard.scss';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_DEBOUNCE_MS = 300;

interface CustomerDashboardProps {
  readonly pageSize?: number;
  readonly debounceMs?: number;
}

export function CustomerDashboard({
  pageSize = DEFAULT_PAGE_SIZE,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: CustomerDashboardProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const resultsRef = useRef<HTMLDivElement>(null);

  const { state, page, totalPages, setPage, retry } = useCustomerSearch({
    query,
    status,
    pageSize,
    debounceMs,
  });

  const handleRetry = () => {
    retry();
    // The "Try again" button unmounts when loading starts; keep keyboard focus in the results area.
    resultsRef.current?.focus();
  };

  const renderResults = () => {
    if (state.loadState === 'error') {
      return (
        <StatusMessage
          variant="error"
          title="We couldn’t load customers"
          message={getErrorMessage(state.error)}
          onRetry={handleRetry}
        />
      );
    }
    if (state.data === null) {
      return <StatusMessage variant="loading" title="Loading customers…" />;
    }
    if (state.data.total === 0) {
      return (
        <StatusMessage
          variant="empty"
          title="No customers found"
          message="Try a different search term or status."
        />
      );
    }
    return <CustomerTable customers={state.data.items} isBusy={state.loadState === 'loading'} />;
  };

  const showPagination =
    state.loadState !== 'error' && state.data !== null && state.data.total > 0;

  return (
    <section className="customer-dashboard" aria-label="Customer search">
      <div className="customer-dashboard__controls">
        <div className="customer-dashboard__search">
          <SearchBox value={query} onChange={setQuery} />
        </div>
        <StatusFilter value={status} onChange={setStatus} />
      </div>

      <p className="customer-dashboard__summary" role="status">
        {describeResults(state, page, pageSize)}
      </p>

      <div
        ref={resultsRef}
        className="customer-dashboard__results"
        tabIndex={-1}
        aria-busy={state.loadState === 'loading'}
      >
        {renderResults()}
      </div>

      {showPagination && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
