import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PurchaseInvoiceInput } from "@/lib/validations/purchases";

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  purchaseDate: Date;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  productId: string;
  productName: string;
  serialNumber: string;
  imei?: string;
  purchasePrice: string;
  paymentMethod: string;
  paidAmount: string;
  notes?: string;
  stockItemId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchasesResponse {
  purchases: PurchaseInvoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface PurchaseFilters {
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  search?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

export const purchaseKeys = {
  all: ["purchases"] as const,
  lists: () => [...purchaseKeys.all, "list"] as const,
  list: (filters: PurchaseFilters) => [...purchaseKeys.lists(), filters] as const,
};

export function usePurchases(filters: PurchaseFilters = {}) {
  return useQuery({
    queryKey: purchaseKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.sellerId) params.sellerId = filters.sellerId;
      if (filters.search) params.search = filters.search;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      return apiClient.get<PurchasesResponse>("/api/purchases", params);
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseInvoiceInput) =>
      apiClient.post("/api/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["stock"] }); // Stock changes
    },
  });
}
