"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // POS data changes infrequently — 5 min stale time reduces network requests
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 min
            gcTime: 10 * 60 * 1000,
            // Don't re-fetch on tab focus (user switches tabs often in POS workflow)
            refetchOnWindowFocus: false,
            // Only retry once on failure — avoid cascading DB connection errors
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
