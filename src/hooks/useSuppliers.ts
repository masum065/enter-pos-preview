import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SupplierInput, SupplierPaymentInput } from "@/lib/validations/purchases";

interface Supplier {
  id: string;
  companyName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: string;
  totalPurchases: string;
  totalPaid: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: string;
  amount: string;
  description: string;
  reference?: string;
  balanceAfter: string;
  createdBy?: string;
  createdAt: Date;
}

interface SupplierWithTransactions extends Supplier {
  transactions: SupplierTransaction[];
}

interface SuppliersResponse {
  suppliers: Supplier[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (filters: { search?: string; page?: number }) => [...supplierKeys.lists(), filters] as const,
  detail: (id: string) => [...supplierKeys.all, "detail", id] as const,
};

export function useSuppliers(filters: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      return apiClient.get<SuppliersResponse>("/api/suppliers", params);
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => apiClient.get<SupplierWithTransactions>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierInput) => apiClient.post<Supplier>("/api/suppliers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: supplierKeys.lists() }); },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierInput }) =>
      apiClient.put<Supplier>(`/api/suppliers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: supplierKeys.lists() }); },
  });
}

export function useSupplierPayment(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierPaymentInput) =>
      apiClient.post(`/api/suppliers/${supplierId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(supplierId) });
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useSuppliersWithDue() {
  const { data } = useSuppliers({ limit: 1000 });
  const suppliersWithDue = data?.suppliers.filter(
    (s) => parseFloat(s.balance) > 0
  ) || [];
  return suppliersWithDue;
}
