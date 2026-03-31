import React from "react";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PaginationLabels {
  /** Prefix label before the page numbers. Default: "Page" */
  page: string;
  /** Label between page numbers and total row count. Default: "of" */
  of: string;
  /** Label after the total row count. Default: "rows" */
  rows: string;
  /** Label between total info and page-size selector. Default: "with" */
  with: string;
  /** Label after the page-size selector. Default: "rows per page" */
  rowsPerPage: string;
  /** Dropdown option representing all rows on one page. Default: "All" */
  all: string;
}

export interface PaginationProps {
  /** Total number of rows in the full (unfiltered) dataset. */
  totalRows: number;
  /** Current page, 1-based. */
  page: number;
  /**
   * Current page size.
   * Use `0` to mean "show all rows" — the `all` label is displayed in the dropdown.
   */
  pageSize: number;
  /** Called when the user clicks a page number. */
  onPageChange: (page: number) => void;
  /** Called when the user selects a different page size. Typically resets to page 1. */
  onPageSizeChange: (pageSize: number) => void;
  /**
   * Available options in the page-size dropdown.
   * `0` renders as the `all` label.
   * Default: [10, 25, 50, 100, 250, 500, 1000, 0]
   */
  pageSizeOptions?: number[];
  /**
   * Maximum number of consecutive page numbers shown in the sliding window
   * before collapsing to "…". Default: 20.
   */
  maxVisiblePages?: number;
  /** Override any subset of display labels (for i18n). */
  labels?: Partial<PaginationLabels>;
  /** Optional className appended to the root element. */
  className?: string;
  /**
   * When true, shows a loading spinner on the page button identified by
   * `pendingPage` (or the current page if `pendingPage` is not set).
   */
  loading?: boolean;
  /**
   * The page number whose button should show a spinner during loading.
   * Defaults to the current `page` value.
   */
  pendingPage?: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE_OPTIONS: number[] = [10, 25, 50, 100, 250, 500, 1000, 0];

const DEFAULT_LABELS: PaginationLabels = {
  page: "Page",
  of: "of",
  rows: "rows",
  with: "with",
  rowsPerPage: "rows per page",
  all: "All",
};

const DEFAULT_MAX_VISIBLE = 20;

// ---------------------------------------------------------------------------
// Page-number window algorithm
// ---------------------------------------------------------------------------

/**
 * Returns an ordered list of page numbers (and "…" separators) to display.
 *
 * Rules:
 * - If totalPages fits within maxVisible + 2, show every page number.
 * - Otherwise show a window of maxVisible pages centered around currentPage,
 *   always including the first and last page, with "…" for gaps of ≥ 1 page.
 */
export function getVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisible: number,
): (number | "…")[] {
  if (totalPages <= 0) return [];
  if (totalPages <= maxVisible + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  const start = Math.max(1, Math.min(currentPage - half, totalPages - maxVisible + 1));
  const end = start + maxVisible - 1;

  const result: (number | "…")[] = [];
  if (start > 1) result.push(1);
  if (start > 2) result.push("…");
  for (let i = start; i <= end; i++) result.push(i);
  if (end < totalPages - 1) result.push("…");
  if (end < totalPages) result.push(totalPages);

  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Pagination: React.FC<PaginationProps> = ({
  totalRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  maxVisiblePages = DEFAULT_MAX_VISIBLE,
  labels: labelsProp,
  className,
  loading = false,
  pendingPage,
}) => {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  const effectivePageSize = pageSize === 0 ? totalRows || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const visiblePages = getVisiblePages(safePage, totalPages, maxVisiblePages);
  const spinnerPage = pendingPage ?? page;

  return (
    <div className={["ct-pagination", className].filter(Boolean).join(" ")}>
      <span className="ct-pagination-label">{labels.page}</span>

      <div className="ct-pagination-pages">
        {visiblePages.map((entry, idx) => {
          if (entry === "…") {
            return (
              <span key={`ellipsis-${idx}`} className="ct-pagination-ellipsis">
                …
              </span>
            );
          }
          const showSpinner = loading && entry === spinnerPage;
          return (
            <button
              key={entry}
              className={["ct-pagination-page", entry === safePage ? "is-current" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => entry !== safePage && onPageChange(entry)}
              aria-current={entry === safePage ? "page" : undefined}
              aria-label={`Page ${entry}`}
            >
              {showSpinner ? <span className="ct-pagination-spinner" /> : entry}
            </button>
          );
        })}
      </div>

      <span className="ct-pagination-label">
        {labels.of} {totalRows} {labels.rows} {labels.with}
      </span>

      <select
        className="ct-pagination-select"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        aria-label={labels.rowsPerPage}
      >
        {pageSizeOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 0 ? labels.all : opt}
          </option>
        ))}
      </select>

      <span className="ct-pagination-label">{labels.rowsPerPage}</span>
    </div>
  );
};
