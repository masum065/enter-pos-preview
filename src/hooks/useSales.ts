import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { 
  CreateSaleInput, 
  AddPaymentInput, 
  ProcessReturnInput 
} from "@/lib/validations/sales";

// Types
interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId: string;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  discountAmount: string;
  taxPercent: string;
  taxAmount: string;
  grandTotal: string;
  paidAmount: string;
  dueAmount: string;
  totalProfit: string;
  totalReturned: string;
  status: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  stockItemId: string;
  serialNumber: string;
  productName: string;
  warranty?: string;
  quantity: number;
  salePrice: string;
  purchasePrice: string;
  discount: string;
  amount: string;
  profit: string;
  isReturned: boolean;
  returnedAt?: Date;
}

interface Payment {
  id: string;
  saleId: string;
  method: string;
  amount: string;
  reference?: string;
  paidAt: Date;
}

interface SaleWithDetails extends Sale {
  items: SaleItem[];
  payments: Payment[];
}

interface SalesResponse {
  sales: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SalesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Query keys
export const salesKeys = {
  all: ["sales"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (filters: SalesFilters) => [...salesKeys.lists(), filters] as const,
  details: () => [...salesKeys.all, "detail"] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
};

// Hooks

/**
 * Fetch sales list with filters
 */
export function useSales(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.status) params.status = filters.status;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);

      return apiClient.get<SalesResponse>("/api/sales", params);
    },
    staleTime: 30 * 1000, // 30 seconds (sales change frequently)
  });
}

/**
 * Fetch single sale with items and payments
 */
export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => apiClient.get<SaleWithDetails>(`/api/sales/${id}`),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Create new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleInput) =>
      apiClient.post<Sale>("/api/sales", data),
    onSuccess: () => {
      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      // Also invalidate stock (items are now sold)
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

/**
 * Add payment to existing sale
 */
export function useAddPayment(saleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddPaymentInput) =>
      apiClient.post(`/api/sales/${saleId}/payments`, data),
    onSuccess: () => {
      // Invalidate specific sale and lists
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
    },
  });
}

/**
 * Process return/refund
 */
export function useProcessReturn(saleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessReturnInput) =>
      apiClient.post(`/api/sales/${saleId}/returns`, data),
    onSuccess: () => {
      // Invalidate sale, sales lists, and stock
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

/**
 * Get today's sales stats
 */
export function useTodaysSales() {
  const today = new Date().toISOString().split("T")[0];
  
  return useSales({
    startDate: today,
    endDate: today,
    limit: 1000, // Get all today's sales
  });
}

/**
 * Get sales with due amount
 */
export function useSalesWithDue() {
  return useSales({
    status: "partial,pending", // Multiple statuses
    limit: 100,
  });
}
