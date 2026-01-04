import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./authStore";
import { useActivityLogStore } from "./activityLogStore";

export type StockStatus = "Available" | "Sold" | "Service" | "Returned" | "Damaged";

export interface StockItem {
  id: string;
  serialNumber: string;
  imei?: string; // For mobile phones
  productId: string;
  purchasePrice: number;
  supplierName?: string;
  purchaseDate: string;
  status: StockStatus;
  soldAt?: string;
  saleId?: string;
  serviceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StockState {
  stockItems: StockItem[];
  isLoading: boolean;

  // Actions
  addStockItem: (data: Omit<StockItem, "id" | "createdAt" | "updatedAt">) => StockItem;
  addBulkStock: (items: Omit<StockItem, "id" | "createdAt" | "updatedAt">[]) => StockItem[];
  updateStockItem: (id: string, data: Partial<StockItem>) => boolean;
  deleteStockItem: (id: string) => boolean;
  
  // Queries
  getStockById: (id: string) => StockItem | undefined;
  getStockBySerial: (serial: string) => StockItem | undefined;
  getStockByProductId: (productId: string) => StockItem[];
  getAvailableStock: () => StockItem[];
  getAvailableStockByProduct: (productId: string) => StockItem[];
  getLowStockProducts: (threshold?: number) => { productId: string; count: number }[];
  
  // Validation
  checkDuplicateSerial: (serial: string, excludeId?: string) => boolean;
  
  // Status updates
  markAsSold: (id: string, saleId: string) => boolean;
  markAsService: (id: string, serviceId: string) => boolean;
  markAsAvailable: (id: string) => boolean;
  
  // Stats
  getTotalStockValue: () => number;
  getAvailableStockCount: () => number;
  getSoldStockCount: () => number;
}

const generateId = () => `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      stockItems: [],
      isLoading: false,

      addStockItem: (data) => {
        // Check for duplicate serial
        if (get().checkDuplicateSerial(data.serialNumber)) {
          throw new Error("Serial number already exists");
        }

        const now = new Date().toISOString();
        const newItem: StockItem = {
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          stockItems: [newItem, ...state.stockItems],
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: newItem.id,
          details: `Added new stock item: ${newItem.serialNumber}`,
          after: newItem
        });

        return newItem;
      },

      addBulkStock: (items) => {
        const now = new Date().toISOString();
        const existingSerials = new Set(get().stockItems.map((s) => s.serialNumber.toLowerCase()));
        const newSerials = new Set<string>();
        const newItems: StockItem[] = [];

        for (const item of items) {
          const serialLower = item.serialNumber.toLowerCase();
          
          // Skip duplicates
          if (existingSerials.has(serialLower) || newSerials.has(serialLower)) {
            continue;
          }

          newSerials.add(serialLower);
          newItems.push({
            ...item,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
          });
        }

        if (newItems.length > 0) {
          set((state) => ({
            stockItems: [...newItems, ...state.stockItems],
          }));

          // Logging (One Action = One Log)
          const currentUser = useAuthStore.getState().currentUser;
          useActivityLogStore.getState().addLog({
            userId: currentUser?.id || "system",
            userName: currentUser?.name || "System",
            userRole: currentUser?.role,
            action: "STOCK_UPDATE",
            details: `Bulk added ${newItems.length} stock items.`,
            after: { count: newItems.length }
          });
        }

        return newItems;
      },

      updateStockItem: (id, data) => {
        const state = get();
        const index = state.stockItems.findIndex((s) => s.id === id);
        
        if (index === -1) return false;

        const oldItem = state.stockItems[index];

        // Check for duplicate serial if updating serial number
        if (data.serialNumber && get().checkDuplicateSerial(data.serialNumber, id)) {
          throw new Error("Serial number already exists");
        }

        const updatedItem = {
          ...oldItem,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          stockItems: state.stockItems.map((s) => (s.id === id ? updatedItem : s)),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Updated stock item ${oldItem.serialNumber}.`,
          before: oldItem,
          after: updatedItem
        });

        return true;
      },

      deleteStockItem: (id) => {
        const state = get();
        const item = state.stockItems.find((s) => s.id === id);
        
        if (!item) return false;
        if (item.status === "Sold") {
          throw new Error("Cannot delete sold stock items");
        }

        set((state) => ({
          stockItems: state.stockItems.filter((s) => s.id !== id),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Deleted stock item: ${item.serialNumber}`,
          before: item
        });

        return true;
      },

      getStockById: (id) => {
        return get().stockItems.find((s) => s.id === id);
      },

      getStockBySerial: (serial) => {
        return get().stockItems.find(
          (s) => s.serialNumber.toLowerCase() === serial.toLowerCase()
        );
      },

      getStockByProductId: (productId) => {
        return get().stockItems.filter((s) => s.productId === productId);
      },

      getAvailableStock: () => {
        return get().stockItems.filter((s) => s.status === "Available");
      },

      getAvailableStockByProduct: (productId) => {
        return get().stockItems.filter(
          (s) => s.productId === productId && s.status === "Available"
        );
      },

      getLowStockProducts: (threshold = 3) => {
        const productCounts: Record<string, number> = {};
        
        get()
          .stockItems.filter((s) => s.status === "Available")
          .forEach((s) => {
            productCounts[s.productId] = (productCounts[s.productId] || 0) + 1;
          });

        return Object.entries(productCounts)
          .filter(([, count]) => count <= threshold)
          .map(([productId, count]) => ({ productId, count }));
      },

      checkDuplicateSerial: (serial, excludeId) => {
        const existing = get().stockItems.find(
          (s) =>
            s.serialNumber.toLowerCase() === serial.toLowerCase() &&
            s.id !== excludeId
        );
        return !!existing;
      },

      markAsSold: (id, saleId) => {
        return get().updateStockItem(id, {
          status: "Sold",
          saleId,
          soldAt: new Date().toISOString(),
        });
      },

      markAsService: (id, serviceId) => {
        return get().updateStockItem(id, {
          status: "Service",
          serviceId,
        });
      },

      markAsAvailable: (id) => {
        return get().updateStockItem(id, {
          status: "Available",
          saleId: undefined,
          serviceId: undefined,
          soldAt: undefined,
        });
      },

      getTotalStockValue: () => {
        return get()
          .stockItems.filter((s) => s.status === "Available")
          .reduce((sum, s) => sum + s.purchasePrice, 0);
      },

      getAvailableStockCount: () => {
        return get().stockItems.filter((s) => s.status === "Available").length;
      },

      getSoldStockCount: () => {
        return get().stockItems.filter((s) => s.status === "Sold").length;
      },
    }),
    {
      name: "enter-pos-stock",
    }
  )
);
