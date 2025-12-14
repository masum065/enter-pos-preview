import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  taxPercent: number;
  currency: string;
  invoicePrefix: string;
  expensePrefix: string;
  servicePrefix: string;
}

interface SettingsState {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  appSettings: AppSettings;
  
  // Keyboard shortcuts
  shortcuts: Record<string, string>;
  
  // Actions
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  shopName: "Enter Computer",
  shopAddress: "Dhaka, Bangladesh",
  shopPhone: "+8801700000000",
  shopEmail: "info@entercomputer.com",
  taxPercent: 0,
  currency: "৳",
  invoicePrefix: "INV",
  expensePrefix: "EXP",
  servicePrefix: "SRV",
};

const DEFAULT_SHORTCUTS: Record<string, string> = {
  "ctrl+n": "New Sale",
  "ctrl+s": "Save",
  "ctrl+p": "Print",
  "ctrl+f": "Search",
  "ctrl+,": "Settings",
  "escape": "Cancel/Close",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "light",
      sidebarCollapsed: false,
      appSettings: DEFAULT_APP_SETTINGS,
      shortcuts: DEFAULT_SHORTCUTS,

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === "light" ? "dark" : "light";
        set({ theme: newTheme });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      updateAppSettings: (settings) => {
        set((state) => ({
          appSettings: { ...state.appSettings, ...settings },
        }));
      },

      resetSettings: () => {
        set({
          theme: "light",
          sidebarCollapsed: false,
          appSettings: DEFAULT_APP_SETTINGS,
          shortcuts: DEFAULT_SHORTCUTS,
        });
      },
    }),
    {
      name: "enter-pos-settings",
    }
  )
);
