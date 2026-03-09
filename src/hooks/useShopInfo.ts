"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ShopInfo } from "@/app/api/shop-info/route";

export function useShopInfo() {
  return useQuery<ShopInfo>({
    queryKey: ["shop-info"],
    queryFn: () => apiClient.get("/api/shop-info"),
    staleTime: 1000 * 60 * 60, // 1 hour — this data rarely changes
    gcTime: 1000 * 60 * 60 * 24, // keep cached 24h
    retry: 1,
  });
}
