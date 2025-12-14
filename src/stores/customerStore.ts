import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nid?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;

  // Actions
  addCustomer: (data: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => boolean;
  deleteCustomer: (id: string) => boolean;
  getCustomerById: (id: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
  getRecentCustomers: (limit?: number) => Customer[];
  getTotalCustomers: () => number;
}

// Generate unique ID
const generateId = () => `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      isLoading: false,

      addCustomer: (data) => {
        const now = new Date().toISOString();
        const newCustomer: Customer = {
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }));

        return newCustomer;
      },

      updateCustomer: (id, data) => {
        const state = get();
        const index = state.customers.findIndex((c) => c.id === id);
        
        if (index === -1) return false;

        const updatedCustomer = {
          ...state.customers[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? updatedCustomer : c)),
        }));

        return true;
      },

      deleteCustomer: (id) => {
        const state = get();
        const exists = state.customers.some((c) => c.id === id);
        
        if (!exists) return false;

        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));

        return true;
      },

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id);
      },

      searchCustomers: (query) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return get().customers;

        return get().customers.filter(
          (c) =>
            c.name.toLowerCase().includes(lowerQuery) ||
            c.phone.includes(lowerQuery) ||
            c.email?.toLowerCase().includes(lowerQuery) ||
            c.nid?.includes(lowerQuery)
        );
      },

      getRecentCustomers: (limit = 10) => {
        return get()
          .customers.slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },

      getTotalCustomers: () => get().customers.length,
    }),
    {
      name: "enter-pos-customers",
    }
  )
);
