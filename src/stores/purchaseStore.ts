import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSupplierStore } from "./supplierStore";
import { useStockStore } from "./stockStore";

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  serialNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "pending" | "partial" | "paid";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseState {
  purchases: Purchase[];
  purchaseCounter: number;
  isLoading: boolean;

  // CRUD
  createPurchase: (data: Omit<Purchase, "id" | "purchaseNumber" | "status" | "createdAt" | "updatedAt">) => Purchase;
  updatePurchase: (id: string, data: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  getPurchaseById: (id: string) => Purchase | undefined;

  // Queries
  getPurchasesBySupplier: (supplierId: string) => Purchase[];
  getPurchasesByDateRange: (startDate: string, endDate: string) => Purchase[];
  getRecentPurchases: (limit?: number) => Purchase[];
  getPurchasesWithDue: () => Purchase[];

  // Payment
  addPayment: (purchaseId: string, amount: number) => void;

  // Stats
  getTodaysPurchases: () => { count: number; total: number };
  getThisMonthPurchases: () => { count: number; total: number };
  getTotalDue: () => number;
}

const generateId = () => `pur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isThisMonth = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: [],
      purchaseCounter: 1,
      isLoading: false,

      createPurchase: (data) => {
        const purchaseNumber = `PUR-${String(get().purchaseCounter).padStart(5, "0")}`;
        
        const status: Purchase["status"] = 
          data.paidAmount >= data.totalAmount ? "paid" : 
          data.paidAmount > 0 ? "partial" : "pending";

        const purchase: Purchase = {
          id: generateId(),
          purchaseNumber,
          ...data,
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          purchases: [...state.purchases, purchase],
          purchaseCounter: state.purchaseCounter + 1,
        }));

        // Add transaction to supplier ledger
        const supplierStore = useSupplierStore.getState();
        supplierStore.addTransaction({
          supplierId: data.supplierId,
          type: "purchase",
          amount: data.totalAmount, // Increases what we owe
          description: `Purchase ${purchaseNumber} - ${data.items.length} items`,
          reference: purchase.id,
          createdBy: data.createdBy,
        });

        // If paid amount > 0, record payment
        if (data.paidAmount > 0) {
          supplierStore.addTransaction({
            supplierId: data.supplierId,
            type: "payment",
            amount: -data.paidAmount, // Decreases what we owe
            description: `Payment for ${purchaseNumber}`,
            reference: purchase.id,
            createdBy: data.createdBy,
          });
        }

        // Add items to stock
        const stockStore = useStockStore.getState();
        data.items.forEach((item) => {
          stockStore.addStockItem({
            productId: item.productId,
            serialNumber: item.serialNumber,
            purchasePrice: item.unitPrice,
            purchaseDate: data.purchaseDate,
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            status: "Available",
            notes: `From ${purchaseNumber}`,
          });
        });

        return purchase;
      },

      updatePurchase: (id, data) => {
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePurchase: (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
      },

      getPurchaseById: (id) => {
        return get().purchases.find((p) => p.id === id);
      },

      getPurchasesBySupplier: (supplierId) => {
        return get()
          .purchases.filter((p) => p.supplierId === supplierId)
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      },

      getPurchasesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return get().purchases.filter((p) => {
          const date = new Date(p.purchaseDate);
          return date >= start && date <= end;
        });
      },

      getRecentPurchases: (limit = 10) => {
        return get()
          .purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },

      getPurchasesWithDue: () => {
        return get().purchases.filter((p) => p.dueAmount > 0);
      },

      addPayment: (purchaseId, amount) => {
        const purchase = get().getPurchaseById(purchaseId);
        if (!purchase) return;

        const newPaidAmount = purchase.paidAmount + amount;
        const newDueAmount = Math.max(0, purchase.totalAmount - newPaidAmount);
        const newStatus: Purchase["status"] = 
          newDueAmount <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

        get().updatePurchase(purchaseId, {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        });

        // Record payment in supplier ledger
        const supplierStore = useSupplierStore.getState();
        supplierStore.addTransaction({
          supplierId: purchase.supplierId,
          type: "payment",
          amount: -amount,
          description: `Payment for ${purchase.purchaseNumber}`,
          reference: purchaseId,
          createdBy: "admin",
        });
      },

      getTodaysPurchases: () => {
        const todayPurchases = get().purchases.filter((p) => isToday(p.purchaseDate));
        return {
          count: todayPurchases.length,
          total: todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
        };
      },

      getThisMonthPurchases: () => {
        const monthPurchases = get().purchases.filter((p) => isThisMonth(p.purchaseDate));
        return {
          count: monthPurchases.length,
          total: monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
        };
      },

      getTotalDue: () => {
        return get().purchases.reduce((sum, p) => sum + p.dueAmount, 0);
      },
    }),
    {
      name: "enter-pos-purchases",
    }
  )
);
