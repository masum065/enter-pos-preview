import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Supplier {
  id: string;
  companyName: string; // Primary identifier (required)
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: number; // Positive = we owe them (payable), Negative = they owe us (receivable)
  totalPurchases: number;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: "stock_add" | "payment" | "return" | "adjustment";
  amount: number; // Positive = increases payable, Negative = decreases payable
  description: string;
  reference?: string; // Stock serial, Payment ref, etc.
  balanceAfter: number;
  createdBy: string;
  createdAt: string;
}

interface SupplierState {
  suppliers: Supplier[];
  transactions: SupplierTransaction[];
  isLoading: boolean;

  // Supplier CRUD
  addSupplier: (data: Omit<Supplier, "id" | "balance" | "totalPurchases" | "totalPaid" | "createdAt" | "updatedAt">) => Supplier;
  updateSupplier: (id: string, data: Partial<Omit<Supplier, "id" | "balance" | "totalPurchases" | "totalPaid" | "createdAt" | "updatedAt">>) => void;
  deleteSupplier: (id: string) => void;
  getSupplierById: (id: string) => Supplier | undefined;
  searchSuppliers: (query: string) => Supplier[];

  // Transactions
  addTransaction: (data: Omit<SupplierTransaction, "id" | "balanceAfter" | "createdAt">) => SupplierTransaction;
  getTransactionsBySupplier: (supplierId: string) => SupplierTransaction[];

  // Payment
  recordPayment: (supplierId: string, amount: number, reference?: string, createdBy?: string) => void;

  // Stats
  getTotalPayable: () => number; // Total we owe to all suppliers
  getTotalReceivable: () => number; // Total suppliers owe us (advances)
  getSuppliersWithDue: () => Supplier[];
}

const generateId = () => `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateTransactionId = () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      transactions: [],
      isLoading: false,

      addSupplier: (data) => {
        const newSupplier: Supplier = {
          id: generateId(),
          ...data,
          balance: 0,
          totalPurchases: 0,
          totalPaid: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          suppliers: [...state.suppliers, newSupplier],
        }));

        return newSupplier;
      },

      updateSupplier: (id, data) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id
              ? { ...s, ...data, updatedAt: new Date().toISOString() }
              : s
          ),
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
          transactions: state.transactions.filter((t) => t.supplierId !== id),
        }));
      },

      getSupplierById: (id) => {
        return get().suppliers.find((s) => s.id === id);
      },

      searchSuppliers: (query) => {
        const q = query.toLowerCase();
        return get().suppliers.filter(
          (s) =>
            s.companyName?.toLowerCase().includes(q) ||
            s.phone?.includes(q)
        );
      },

      addTransaction: (data) => {
        const supplier = get().getSupplierById(data.supplierId);
        if (!supplier) throw new Error("Supplier not found");

        const newBalance = supplier.balance + data.amount;

        const transaction: SupplierTransaction = {
          id: generateTransactionId(),
          ...data,
          balanceAfter: newBalance,
          createdAt: new Date().toISOString(),
        };

        // Update supplier balance and totals
        const updates: Partial<Supplier> = {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        };

        if (data.type === "stock_add") {
          updates.totalPurchases = supplier.totalPurchases + Math.abs(data.amount);
        } else if (data.type === "payment") {
          updates.totalPaid = supplier.totalPaid + Math.abs(data.amount);
        }

        set((state) => ({
          transactions: [...state.transactions, transaction],
          suppliers: state.suppliers.map((s) =>
            s.id === data.supplierId ? { ...s, ...updates } : s
          ),
        }));

        return transaction;
      },

      getTransactionsBySupplier: (supplierId) => {
        return get()
          .transactions.filter((t) => t.supplierId === supplierId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      recordPayment: (supplierId, amount, reference, createdBy = "admin") => {
        get().addTransaction({
          supplierId,
          type: "payment",
          amount: -amount, // Payment reduces balance (what we owe)
          description: `Payment to supplier`,
          reference,
          createdBy,
        });
      },

      getTotalPayable: () => {
        return get().suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);
      },

      getTotalReceivable: () => {
        return get().suppliers.reduce((sum, s) => sum + Math.abs(Math.min(0, s.balance)), 0);
      },

      getSuppliersWithDue: () => {
        return get().suppliers.filter((s) => s.balance > 0);
      },
    }),
    {
      name: "enter-pos-suppliers",
    }
  )
);
