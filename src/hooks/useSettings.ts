import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/settings";

// Settings types
interface ShopSettings {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  taxPercent?: number;
  currency?: string;
  invoicePrefix?: string;
  expensePrefix?: string;
  servicePrefix?: string;
  [key: string]: any;
}

// User types
interface User {
  id: string;
  userId: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

interface UsersResponse {
  users: User[];
}

// Query keys
export const settingsKeys = {
  all: ["settings"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

// ==================== Settings Hooks ====================

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => apiClient.get<ShopSettings>("/api/settings"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ShopSettings>) =>
      apiClient.put<ShopSettings>("/api/settings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: settingsKeys.all }); },
  });
}

// ==================== User Management Hooks ====================

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => apiClient.get<UsersResponse>("/api/users"),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get<User>(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => apiClient.post<User>("/api/users", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: userKeys.all }); },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      apiClient.put<User>(`/api/users/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: userKeys.all }); },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; currentPassword?: string; newPassword: string }) =>
      apiClient.patch(`/api/users/${id}`, data),
  });
}
