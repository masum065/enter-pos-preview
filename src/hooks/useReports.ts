import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Dashboard types
interface DashboardStats {
  today: { sales: number; revenue: string; profit: string; expenses: string };
  thisMonth: { sales: number; revenue: string; profit: string; expenses: string };
  totalDue: string;
  stock: { total: number; available: number; sold: number; service: number; returned: number; damaged: number };
  services: { pending: number; dueAmount: string };
  totalCustomers: number;
}

// Sales report types
interface SalesReport {
  period: { start: string; end: string };
  sales: {
    totalSales: number; totalRevenue: string; totalProfit: string;
    totalDue: string; totalPaid: string; totalDiscount: string;
    totalTax: string; totalReturned: string; avgOrderValue: string;
  };
  expenses: { totalExpenses: string };
  profitAnalysis: { grossProfit: string; totalExpenses: string; netProfit: string; profitMargin: string };
  salesByPeriod: Array<{ period: string; sales: number; revenue: string; profit: string }>;
  paymentBreakdown: Array<{ method: string; count: number; total: string }>;
}

// Inventory report types
interface InventoryReport {
  overview: { totalItems: number; available: number; sold: number; service: number; returned: number; damaged: number; totalStockValue: string; availableStockValue: string };
  byCategory: Array<{ category: string; totalItems: number; available: number; sold: number; stockValue: string }>;
  byBrand: Array<{ brand: string; totalItems: number; available: number; stockValue: string }>;
  lowStock: Array<{ productId: string; modelName: string; brand: string; category: string; available: number }>;
  bySource: Array<{ purchaseSource: string; count: number; value: string }>;
}

// Activity log types
interface ActivityLog {
  id: string; userId: string; userName: string; userRole: string;
  action: string; entityId?: string; details: string;
  beforeData?: any; afterData?: any; ipAddress?: string;
  createdAt: Date;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  actions: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Query keys
export const reportKeys = {
  dashboard: ["reports", "dashboard"] as const,
  sales: (filters: Record<string, string>) => ["reports", "sales", filters] as const,
  inventory: ["reports", "inventory"] as const,
  activityLogs: (filters: Record<string, string>) => ["activityLogs", filters] as const,
};

// Dashboard stats (refresh every 30s)
export function useDashboardStats() {
  return useQuery({
    queryKey: reportKeys.dashboard,
    queryFn: () => apiClient.get<DashboardStats>("/api/reports/dashboard"),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Sales report
export function useSalesReport(filters: { startDate?: string; endDate?: string; groupBy?: string } = {}) {
  const params: Record<string, string> = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.groupBy) params.groupBy = filters.groupBy;

  return useQuery({
    queryKey: reportKeys.sales(params),
    queryFn: () => apiClient.get<SalesReport>("/api/reports/sales", params),
    staleTime: 60 * 1000,
  });
}

// Inventory report
export function useInventoryReport() {
  return useQuery({
    queryKey: reportKeys.inventory,
    queryFn: () => apiClient.get<InventoryReport>("/api/reports/inventory"),
    staleTime: 60 * 1000,
  });
}

// Activity logs
export function useActivityLogs(filters: { userId?: string; action?: string; startDate?: string; endDate?: string; page?: number; limit?: number } = {}) {
  const params: Record<string, string> = {};
  if (filters.userId) params.userId = filters.userId;
  if (filters.action) params.action = filters.action;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);

  return useQuery({
    queryKey: reportKeys.activityLogs(params),
    queryFn: () => apiClient.get<ActivityLogsResponse>("/api/activity-logs", params),
  });
}
