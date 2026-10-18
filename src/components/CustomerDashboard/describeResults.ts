import type { SearchState } from '../../hooks/useCustomerSearch';

/**
 * Text for the polite live region, so screen reader users hear what sighted
 * users see. Errors are announced separately by the error panel (role="alert").
 */
export function describeResults(state: SearchState, page: number, pageSize: number): string {
  if (state.loadState === 'error') {
    return '';
  }
  if (state.loadState === 'loading') {
    return state.data === null ? 'Loading customers…' : 'Updating results…';
  }
  const { total } = state.data;
  if (total === 0) {
    return 'No customers found.';
  }
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `Showing ${String(first)}–${String(last)} of ${String(total)} customers`;
}
