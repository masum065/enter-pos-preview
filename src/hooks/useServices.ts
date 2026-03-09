import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ServiceRecordInput } from "@/lib/validations/services";

interface ServiceRecord {
  id: string;
  serviceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  imei?: string;
  problemDescription: string;
  diagnosis?: string;
  solutionApplied?: string;
  receivedDate: Date;
  expectedDeliveryDate?: Date;
  completedDate?: Date;
  deliveredDate?: Date;
  estimatedCost: string;
  serviceCharge: string;
  partsCost: string;
  totalCost: string;
  status: string;
  paymentStatus: string;
  paidAmount: string;
  dueAmount: string;
  notes?: string;
  technicianNotes?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServicesResponse {
  services: ServiceRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ServiceFilters {
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (filters: ServiceFilters) => [...serviceKeys.lists(), filters] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
};

export function useServices(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);
      return apiClient.get<ServicesResponse>("/api/services", params);
    },
    staleTime: 30 * 1000,
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => apiClient.get<ServiceRecord>(`/api/services/${id}`),
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ServiceRecordInput) => apiClient.post<ServiceRecord>("/api/services", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: serviceKeys.lists() }); },
  });
}

export function useUpdateServiceStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      apiClient.patch<ServiceRecord>(`/api/services/${id}`, { action: "updateStatus", status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}

export function useAddServicePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: string | number) =>
      apiClient.patch<ServiceRecord>(`/api/services/${id}`, { action: "addPayment", amount: String(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}

export function usePendingServices() {
  return useServices({ limit: 1000 });
}
