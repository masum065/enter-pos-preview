import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CustomerInput } from "@/lib/validations/purchases";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nid?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomersResponse {
  customers: Customer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: { search?: string; page?: number }) => [...customerKeys.lists(), filters] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
};

export function useCustomers(filters: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      return apiClient.get<CustomersResponse>("/api/customers", params);
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => apiClient.get<Customer>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerInput) => apiClient.post<Customer>("/api/customers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: customerKeys.lists() }); },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerInput }) =>
      apiClient.put<Customer>(`/api/customers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/customers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: customerKeys.lists() }); },
  });
}
