import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ProductInput } from "@/lib/validations/inventory";

// Types
interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: string;
  description?: string;
  specifications?: string;
  defaultSalePrice: string;
  warranty?: string;
  imageUrl?: string;
  isDeleted: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProductFilters {
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

// Query keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Hooks

/**
 * Fetch all products with optional filters
 */
export function useProducts(filters: ProductFilters = {}, enabled = true) {
  return useQuery({
    queryKey: productKeys.list(filters),
    enabled,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);

      return apiClient.get<ProductsResponse>("/api/products", params);
    },
  });
}


/**
 * Fetch single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.get<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

/**
 * Create new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductInput) =>
      apiClient.post<Product>("/api/products", data),
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Update existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductInput }) =>
      apiClient.put<Product>(`/api/products/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate specific product and lists
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Delete product (soft delete)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean; product: Product }>(`/api/products/${id}`),
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
