"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className="flex items-center justify-center pt-4">
      <ul className="flex flex-wrap items-center gap-1">
        {/* Previous Button */}
        <li>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex size-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-blue-600 hover:text-white disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-blue-600"
            aria-label="Go to previous page"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M12.1758 16.1158C12.007 16.1158 11.8383 16.0596 11.7258 15.9189L5.36953 9.45019C5.11641 9.19707 5.11641 8.80332 5.36953 8.5502L11.7258 2.08145C11.9789 1.82832 12.3727 1.82832 12.6258 2.08145C12.8789 2.33457 12.8789 2.72832 12.6258 2.98145L6.71953 9.0002L12.6539 15.0189C12.907 15.2721 12.907 15.6658 12.6539 15.9189C12.4852 16.0314 12.3445 16.1158 12.1758 16.1158Z" />
            </svg>
          </button>
        </li>

        {/* Page Numbers */}
        {pages.map((page, idx) =>
          page === "..." ? (
            <li key={`dots-${idx}`}>
              <span className="flex items-center justify-center px-2 py-1.5 text-gray-400 dark:text-gray-500">
                <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
                  <path d="M1.92773 15.0674C2.41992 15.0674 2.8164 14.6641 2.8164 14.1787C2.8164 13.6865 2.41992 13.29 1.92773 13.29C1.44238 13.29 1.03906 13.6865 1.03906 14.1787C1.03906 14.6641 1.44238 15.0674 1.92773 15.0674ZM5.99998 15.0674C6.49217 15.0674 6.88865 14.6641 6.88865 14.1787C6.88865 13.6865 6.49217 13.29 5.99998 13.29C5.51463 13.29 5.11131 13.6865 5.11131 14.1787C5.11131 14.6641 5.51463 15.0674 5.99998 15.0674ZM10.0722 15.0674C10.5644 15.0674 10.9609 14.6641 10.9609 14.1787C10.9609 13.6865 10.5644 13.29 10.0722 13.29C9.58689 13.29 9.18357 13.6865 9.18357 14.1787C9.18357 14.6641 9.58689 15.0674 10.0722 15.0674Z" />
                </svg>
              </span>
            </li>
          ) : (
            <li key={page}>
              <button
                onClick={() => onPageChange(page)}
                className={`flex min-w-[36px] items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-blue-600 hover:text-white dark:text-gray-300 dark:hover:bg-blue-600"
                }`}
              >
                {page}
              </button>
            </li>
          )
        )}

        {/* Next Button */}
        <li>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex size-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-blue-600 hover:text-white disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-blue-600"
            aria-label="Go to next page"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M5.81953 16.1158C5.65078 16.1158 5.51016 16.0596 5.36953 15.9471C5.11641 15.6939 5.11641 15.3002 5.36953 15.0471L11.2758 9.0002L5.36953 2.98145C5.11641 2.72832 5.11641 2.33457 5.36953 2.08145C5.62266 1.82832 6.01641 1.82832 6.26953 2.08145L12.6258 8.5502C12.8789 8.80332 12.8789 9.19707 12.6258 9.45019L6.26953 15.9189C6.15703 16.0314 5.98828 16.1158 5.81953 16.1158Z" />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
}
