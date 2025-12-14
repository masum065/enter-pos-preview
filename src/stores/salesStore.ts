import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer" | "Other";

export interface SaleItem {
  id: string;
  productId: string;
  stockItemId: string;
  serialNumber: string;
  productName: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  discount: number;
  amount: number;
  profit: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  paidAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  items: SaleItem[];
  
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  
  payments: Payment[];
  paidAmount: number;
  dueAmount: number;
  
  totalProfit: number;
  
  status: "completed" | "partial" | "pending";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DraftSale {
  customerId?: string;
  items: Partial<SaleItem>[];
  discount?: number;
  payments: Partial<Payment>[];
  notes?: string;
}

interface SalesState {
  sales: Sale[];
  draftSale: DraftSale | null;
  invoiceCounter: number;
  isLoading: boolean;

  // Actions
  createSale: (data: Omit<Sale, "id" | "invoiceNumber" | "createdAt" | "updatedAt">) => Sale;
  updateSale: (id: string, data: Partial<Sale>) => boolean;
  deleteSale: (id: string) => boolean;
  
  // Queries
  getSaleById: (id: string) => Sale | undefined;
  getSaleByInvoice: (invoiceNumber: string) => Sale | undefined;
  getAllSales: () => Sale[];
  getSalesByDateRange: (startDate: string, endDate: string) => Sale[];
  getSalesByCustomer: (customerId: string) => Sale[];
  getSalesWithDue: () => Sale[];
  getRecentSales: (limit?: number) => Sale[];
  
  // Payments
  addPayment: (saleId: string, payment: Omit<Payment, "id" | "paidAt">) => boolean;
  
  // Invoice
  generateInvoiceNumber: () => string;
  
  // Draft
  saveDraft: (draft: DraftSale) => void;
  clearDraft: () => void;
  
  // Stats
  getTodaysSales: () => { count: number; total: number };
  getThisMonthSales: () => { count: number; total: number };
  getTotalDue: () => number;
  getTodaysProfit: () => number;
  getThisMonthProfit: () => number;
}

const generateId = () => `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generatePaymentId = () => `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: [],
      draftSale: null,
      invoiceCounter: 1,
      isLoading: false,

      createSale: (data) => {
        const now = new Date().toISOString();
        const invoiceNumber = get().generateInvoiceNumber();
        
        const newSale: Sale = {
          ...data,
          id: generateId(),
          invoiceNumber,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          sales: [newSale, ...state.sales],
          invoiceCounter: state.invoiceCounter + 1,
          draftSale: null,
        }));

        return newSale;
      },

      updateSale: (id, data) => {
        const state = get();
        const index = state.sales.findIndex((s) => s.id === id);
        
        if (index === -1) return false;

        const updatedSale = {
          ...state.sales[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          sales: state.sales.map((s) => (s.id === id ? updatedSale : s)),
        }));

        return true;
      },

      deleteSale: (id) => {
        const state = get();
        const exists = state.sales.some((s) => s.id === id);
        
        if (!exists) return false;

        set((state) => ({
          sales: state.sales.filter((s) => s.id !== id),
        }));

        return true;
      },

      getSaleById: (id) => {
        return get().sales.find((s) => s.id === id);
      },

      getSaleByInvoice: (invoiceNumber) => {
        return get().sales.find((s) => s.invoiceNumber === invoiceNumber);
      },

      getAllSales: () => get().sales,

      getSalesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        return get().sales.filter((s) => {
          const saleDate = new Date(s.invoiceDate).getTime();
          return saleDate >= start && saleDate <= end;
        });
      },

      getSalesByCustomer: (customerId) => {
        return get().sales.filter((s) => s.customerId === customerId);
      },

      getSalesWithDue: () => {
        return get().sales.filter((s) => s.dueAmount > 0);
      },

      getRecentSales: (limit = 10) => {
        return get()
          .sales.slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },

      addPayment: (saleId, payment) => {
        const state = get();
        const sale = state.sales.find((s) => s.id === saleId);
        
        if (!sale) return false;

        const newPayment: Payment = {
          ...payment,
          id: generatePaymentId(),
          paidAt: new Date().toISOString(),
        };

        const newPayments = [...sale.payments, newPayment];
        const newPaidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const newDueAmount = sale.grandTotal - newPaidAmount;
        const newStatus = newDueAmount <= 0 ? "completed" : newDueAmount < sale.grandTotal ? "partial" : "pending";

        return get().updateSale(saleId, {
          payments: newPayments,
          paidAmount: newPaidAmount,
          dueAmount: Math.max(0, newDueAmount),
          status: newStatus,
        });
      },

      generateInvoiceNumber: () => {
        const year = new Date().getFullYear();
        const counter = get().invoiceCounter;
        return `INV-${year}-${counter.toString().padStart(4, "0")}`;
      },

      saveDraft: (draft) => {
        set({ draftSale: draft });
      },

      clearDraft: () => {
        set({ draftSale: null });
      },

      getTodaysSales: () => {
        const todaySales = get().sales.filter((s) => isToday(s.invoiceDate));
        return {
          count: todaySales.length,
          total: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
        };
      },

      getThisMonthSales: () => {
        const monthSales = get().sales.filter((s) => isThisMonth(s.invoiceDate));
        return {
          count: monthSales.length,
          total: monthSales.reduce((sum, s) => sum + s.grandTotal, 0),
        };
      },

      getTotalDue: () => {
        return get().sales.reduce((sum, s) => sum + s.dueAmount, 0);
      },

      getTodaysProfit: () => {
        return get()
          .sales.filter((s) => isToday(s.invoiceDate))
          .reduce((sum, s) => sum + s.totalProfit, 0);
      },

      getThisMonthProfit: () => {
        return get()
          .sales.filter((s) => isThisMonth(s.invoiceDate))
          .reduce((sum, s) => sum + s.totalProfit, 0);
      },
    }),
    {
      name: "enter-pos-sales",
    }
  )
);

// Helper to calculate sale item
export const calculateSaleItem = (
  salePrice: number,
  purchasePrice: number,
  discount: number = 0
): { amount: number; profit: number } => {
  const amount = salePrice - discount;
  const profit = amount - purchasePrice;
  return { amount, profit };
};

// Helper to calculate sale totals
export const calculateSaleTotals = (
  items: SaleItem[],
  discountAmount: number = 0,
  taxPercent: number = 0
): {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  totalProfit: number;
} => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
  const grandTotal = subtotal - discountAmount + taxAmount;
  const totalProfit = items.reduce((sum, item) => sum + item.profit, 0) - discountAmount;

  return {
    subtotal,
    taxAmount,
    grandTotal,
    totalProfit,
  };
};
