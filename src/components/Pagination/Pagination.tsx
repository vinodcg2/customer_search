import './Pagination.scss';

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
}

/**
 * Previous / Next controls. The buttons use aria-disabled rather than the
 * disabled attribute so that a keyboard user pressing Next on the second-to-last
 * page does not lose focus when the button becomes unavailable.
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__button"
        aria-label="Previous page"
        aria-disabled={isFirstPage}
        onClick={() => {
          if (!isFirstPage) {
            onPageChange(page - 1);
          }
        }}
      >
        Previous
      </button>
      <p className="pagination__status">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        className="pagination__button"
        aria-label="Next page"
        aria-disabled={isLastPage}
        onClick={() => {
          if (!isLastPage) {
            onPageChange(page + 1);
          }
        }}
      >
        Next
      </button>
    </nav>
  );
}
