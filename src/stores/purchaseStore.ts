import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PaymentMethod } from "./salesStore";
import { useAuthStore } from "./authStore";
import { useActivityLogStore } from "./activityLogStore";

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // e.g., "PURCH-2026-0001"
  purchaseDate: string;
  sellerId: string; // Customer ID (seller)
  sellerName: string;
  sellerPhone: string;
  productId: string;
  productName: string;
  serialNumber: string;
  imei?: string;
  purchasePrice: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  notes?: string;
  stockItemId: string; // Link to created stock item
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseState {
  purchases: PurchaseInvoice[];
  purchaseCounter: number;
  isLoading: boolean;

  // Actions
  addPurchase: (data: Omit<PurchaseInvoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">) => PurchaseInvoice;
  updatePurchase: (id: string, data: Partial<PurchaseInvoice>) => boolean;
  deletePurchase: (id: string) => boolean;

  // Queries
  getPurchaseById: (id: string) => PurchaseInvoice | undefined;
  getPurchasesBySeller: (sellerId: string) => PurchaseInvoice[];
  getPurchasesByDateRange: (startDate: string, endDate: string) => PurchaseInvoice[];
  getRecentPurchases: (limit?: number) => PurchaseInvoice[];

  // Utils
  generateInvoiceNumber: () => string;
  getTotalPurchaseAmount: () => number;
  getMonthlyPurchaseTotal: (month: number, year: number) => number;
}

const generateId = () => `purch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: [],
      purchaseCounter: 1,
      isLoading: false,

      addPurchase: (data) => {
        const now = new Date().toISOString();
        const invoiceNumber = get().generateInvoiceNumber();

        const newPurchase: PurchaseInvoice = {
          ...data,
          id: generateId(),
          invoiceNumber,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          purchases: [newPurchase, ...state.purchases],
          purchaseCounter: state.purchaseCounter + 1,
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: newPurchase.id,
          details: `Purchased product from ${newPurchase.sellerName}: ${newPurchase.productName} (${newPurchase.serialNumber}) for ৳${newPurchase.purchasePrice}`,
          after: newPurchase,
        });

        return newPurchase;
      },

      updatePurchase: (id, data) => {
        const state = get();
        const index = state.purchases.findIndex((p) => p.id === id);

        if (index === -1) return false;

        const updatedPurchase = {
          ...state.purchases[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        const oldPurchase = state.purchases[index];
        set((state) => ({
          purchases: state.purchases.map((p) => (p.id === id ? updatedPurchase : p)),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Updated purchase: ${oldPurchase.invoiceNumber}`,
          before: oldPurchase,
          after: updatedPurchase,
        });

        return true;
      },

      deletePurchase: (id) => {
        const state = get();
        const purchase = state.purchases.find((p) => p.id === id);

        if (!purchase) return false;

        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Deleted purchase: ${purchase.invoiceNumber}`,
          before: purchase,
        });

        return true;
      },

      getPurchaseById: (id) => {
        return get().purchases.find((p) => p.id === id);
      },

      getPurchasesBySeller: (sellerId) => {
        return get().purchases.filter((p) => p.sellerId === sellerId);
      },

      getPurchasesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return get().purchases.filter((p) => {
          const purchaseDate = new Date(p.purchaseDate).getTime();
          return purchaseDate >= start && purchaseDate <= end;
        });
      },

      getRecentPurchases: (limit = 10) => {
        return get()
          .purchases.slice()
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
          .slice(0, limit);
      },

      generateInvoiceNumber: () => {
        const year = new Date().getFullYear();
        const counter = get().purchaseCounter;
        return `PURCH-${year}-${counter.toString().padStart(4, "0")}`;
      },

      getTotalPurchaseAmount: () => {
        return get().purchases.reduce((sum, p) => sum + p.purchasePrice, 0);
      },

      getMonthlyPurchaseTotal: (month, year) => {
        return get()
          .purchases.filter((p) => {
            const date = new Date(p.purchaseDate);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((sum, p) => sum + p.purchasePrice, 0);
      },
    }),
    {
      name: "enter-pos-purchases",
    }
  )
);
