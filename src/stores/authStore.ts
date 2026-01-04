import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useActivityLogStore } from "./activityLogStore";

export type UserRole = "admin" | "manager" | "cashier";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

// Mock users for authentication
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "admin@entercomputer.com": {
    password: "admin123",
    user: {
      id: "user_001",
      name: "Admin User",
      email: "admin@entercomputer.com",
      role: "admin",
      avatar: "/images/user/default-avatar.png",
      createdAt: "2024-01-01",
    },
  },
  "manager@entercomputer.com": {
    password: "manager123",
    user: {
      id: "user_002",
      name: "Manager User",
      email: "manager@entercomputer.com",
      role: "manager",
      avatar: "/images/user/default-avatar.png",
      createdAt: "2024-01-01",
    },
  },
  "cashier@entercomputer.com": {
    password: "cashier123",
    user: {
      id: "user_003",
      name: "Cashier User",
      email: "cashier@entercomputer.com",
      role: "cashier",
      avatar: "/images/user/default-avatar.png",
      createdAt: "2024-01-01",
    },
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockUser = MOCK_USERS[email.toLowerCase()];

        if (mockUser && mockUser.password === password) {
          set({
            currentUser: mockUser.user,
            isAuthenticated: true,
            isLoading: false,
          });

          useActivityLogStore.getState().addLog({
            userId: mockUser.user.id,
            userName: mockUser.user.name,
            userRole: mockUser.user.role,
            action: "LOGIN",
            details: `User ${mockUser.user.name} logged in successfully.`,
          });

          return true;
        }

        set({ isLoading: false });
        return false;
      },

      logout: () => {
        const user = get().currentUser;
        if (user) {
          useActivityLogStore.getState().addLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: "LOGOUT",
            details: `User ${user.name} logged out.`,
          });
        }

        set({
          currentUser: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "enter-pos-auth",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Role-based permission helpers
export const ROLE_PERMISSIONS = {
  admin: {
    canViewPurchasePrice: true,
    canViewProfit: true,
    canManageUsers: true,
    canDeleteRecords: true,
    canExportData: true,
    canViewReports: true,
    canManageSettings: true,
  },
  manager: {
    canViewPurchasePrice: true,
    canViewProfit: true,
    canManageUsers: false,
    canDeleteRecords: false,
    canExportData: true,
    canViewReports: true,
    canManageSettings: false,
  },
  cashier: {
    canViewPurchasePrice: false,
    canViewProfit: false,
    canManageUsers: false,
    canDeleteRecords: false,
    canExportData: false,
    canViewReports: false,
    canManageSettings: false,
  },
} as const;

export const hasPermission = (
  role: UserRole | undefined,
  permission: keyof (typeof ROLE_PERMISSIONS)["admin"]
): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role][permission];
};
