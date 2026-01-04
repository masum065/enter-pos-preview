import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PaymentMethod } from "./salesStore";
import { useAuthStore } from "./authStore";
import { useActivityLogStore } from "./activityLogStore";

export type ExpenseCategory = 
  | "Rent"
  | "Salary"
  | "Purchase/Stock"
  | "Utilities"
  | "Service Parts"
  | "Transportation"
  | "Tea/Snacks"
  | "Office Supplies"
  | "Marketing"
  | "Maintenance"
  | "Miscellaneous";

export interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paidBy: string;
  receipt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseState {
  expenses: Expense[];
  categories: ExpenseCategory[];
  expenseCounter: number;
  isLoading: boolean;

  // Actions
  addExpense: (data: Omit<Expense, "id" | "expenseNumber" | "createdAt" | "updatedAt">) => Expense;
  updateExpense: (id: string, data: Partial<Expense>) => boolean;
  deleteExpense: (id: string) => boolean;
  
  // Queries
  getExpenseById: (id: string) => Expense | undefined;
  getExpensesByCategory: (category: ExpenseCategory) => Expense[];
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  getRecentExpenses: (limit?: number) => Expense[];
  
  // Stats
  generateExpenseNumber: () => string;
  getTodaysExpenses: () => number;
  getThisMonthExpenses: () => number;
  getMonthlyTotal: (month: number, year: number) => number;
  getCategoryBreakdown: () => { category: ExpenseCategory; total: number }[];
  getPaymentMethodBreakdown: () => { method: PaymentMethod; total: number }[];
}

const generateId = () => `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Salary",
  "Purchase/Stock",
  "Utilities",
  "Service Parts",
  "Transportation",
  "Tea/Snacks",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];

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

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      categories: DEFAULT_CATEGORIES,
      expenseCounter: 1,
      isLoading: false,

      addExpense: (data) => {
        const now = new Date().toISOString();
        const expenseNumber = get().generateExpenseNumber();
        
        const newExpense: Expense = {
          ...data,
          id: generateId(),
          expenseNumber,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          expenses: [newExpense, ...state.expenses],
          expenseCounter: state.expenseCounter + 1,
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: newExpense.id,
          details: `Added new expense: ${newExpense.expenseNumber} - ${newExpense.category}. Amount: ${newExpense.amount}`,
          after: newExpense
        });

        return newExpense;
      },

      updateExpense: (id, data) => {
        const state = get();
        const index = state.expenses.findIndex((e) => e.id === id);
        
        if (index === -1) return false;

        const updatedExpense = {
          ...state.expenses[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        const oldExpense = state.expenses[index];
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? updatedExpense : e)),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Updated expense: ${oldExpense.expenseNumber}`,
          before: oldExpense,
          after: updatedExpense
        });

        return true;
      },

      deleteExpense: (id) => {
        const state = get();
        const exists = state.expenses.some((e) => e.id === id);
        
        if (!exists) return false;

        const expense = state.expenses.find((e) => e.id === id);
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Deleted expense: ${expense?.expenseNumber}`,
          before: expense
        });

        return true;
      },

      getExpenseById: (id) => {
        return get().expenses.find((e) => e.id === id);
      },

      getExpensesByCategory: (category) => {
        return get().expenses.filter((e) => e.category === category);
      },

      getExpensesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        return get().expenses.filter((e) => {
          const expenseDate = new Date(e.date).getTime();
          return expenseDate >= start && expenseDate <= end;
        });
      },

      getRecentExpenses: (limit = 10) => {
        return get()
          .expenses.slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit);
      },

      generateExpenseNumber: () => {
        const year = new Date().getFullYear();
        const counter = get().expenseCounter;
        return `EXP-${year}-${counter.toString().padStart(4, "0")}`;
      },

      getTodaysExpenses: () => {
        return get()
          .expenses.filter((e) => isToday(e.date))
          .reduce((sum, e) => sum + e.amount, 0);
      },

      getThisMonthExpenses: () => {
        return get()
          .expenses.filter((e) => isThisMonth(e.date))
          .reduce((sum, e) => sum + e.amount, 0);
      },

      getMonthlyTotal: (month, year) => {
        return get()
          .expenses.filter((e) => {
            const date = new Date(e.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((sum, e) => sum + e.amount, 0);
      },

      getCategoryBreakdown: () => {
        const breakdown: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
        
        get().expenses.forEach((e) => {
          breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
        });

        return Object.entries(breakdown)
          .map(([category, total]) => ({
            category: category as ExpenseCategory,
            total,
          }))
          .sort((a, b) => b.total - a.total);
      },

      getPaymentMethodBreakdown: () => {
        const breakdown: Record<PaymentMethod, number> = {} as Record<PaymentMethod, number>;
        
        get().expenses.forEach((e) => {
          breakdown[e.paymentMethod] = (breakdown[e.paymentMethod] || 0) + e.amount;
        });

        return Object.entries(breakdown)
          .map(([method, total]) => ({
            method: method as PaymentMethod,
            total,
          }))
          .sort((a, b) => b.total - a.total);
      },
    }),
    {
      name: "enter-pos-expenses",
    }
  )
);
