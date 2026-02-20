import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ExpenseInput } from "@/lib/validations/services";

interface Expense {
  id: string;
  expenseNumber: string;
  date: Date;
  category: string;
  description: string;
  paymentMethod: string;
  amount: string;
  paidBy: string;
  receipt?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryBreakdown {
  category: string;
  total: string;
  count: number;
}

interface ExpensesResponse {
  expenses: Expense[];
  categoryBreakdown: CategoryBreakdown[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ExpenseFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (filters: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
  detail: (id: string) => [...expenseKeys.all, "detail", id] as const,
};

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      return apiClient.get<ExpensesResponse>("/api/expenses", params);
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => apiClient.get<Expense>(`/api/expenses/${id}`),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseInput) => apiClient.post<Expense>("/api/expenses", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: expenseKeys.lists() }); },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseInput }) =>
      apiClient.put<Expense>(`/api/expenses/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: expenseKeys.lists() }); },
  });
}
