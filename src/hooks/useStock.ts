import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { StockItemInput } from "@/lib/validations/inventory";

// Types
interface StockItem {
  id: string;
  serialNumber: string;
  imei?: string;
  productId: string;
  purchasePrice: string;
  purchaseSource: string;
  supplierId?: string;
  supplierName?: string;
  sellerId?: string;
  purchaseDate: Date;
  status: string;
  saleId?: string;
  serviceId?: string;
  soldAt?: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: string;
  defaultSalePrice: string;
}

interface StockItemWithProduct {
  stockItem: StockItem;
  product: Product | null;
}

interface StockItemsResponse {
  stockItems: StockItemWithProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StockFilters {
  productId?: string;
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface LowStockProduct {
  product: Product;
  availableCount: number;
}

// Query keys
export const stockKeys = {
  all: ["stock"] as const,
  lists: () => [...stockKeys.all, "list"] as const,
  list: (filters: StockFilters) => [...stockKeys.lists(), filters] as const,
  lowStock: () => [...stockKeys.all, "lowStock"] as const,
};

// Hooks

/**
 * Fetch stock items with optional filters
 */
export function useStockItems(filters: StockFilters = {}) {
  return useQuery({
    queryKey: stockKeys.list(filters),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.productId) params.productId = filters.productId;
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);

      return apiClient.get<StockItemsResponse>("/api/stock", params);
    },
  });
}

/**
 * Fetch products with low stock
 */
export function useLowStock() {
  return useQuery({
    queryKey: stockKeys.lowStock(),
    queryFn: () =>
      apiClient.get<{ lowStockProducts: LowStockProduct[] }>("/api/stock/low-stock"),
  });
}

/**
 * Add new stock item
 */
export function useAddStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StockItemInput) =>
      apiClient.post<StockItem>("/api/stock", data),
    onSuccess: () => {
      // Invalidate stock lists and low stock
      queryClient.invalidateQueries({ queryKey: stockKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stockKeys.lowStock() });
    },
  });
}

/**
 * Update stock item status
 */
export function useUpdateStockStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put<StockItem>(`/api/stock/${id}`, { status }),
    onSuccess: () => {
      // Invalidate stock lists
      queryClient.invalidateQueries({ queryKey: stockKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stockKeys.lowStock() });
    },
  });
}
