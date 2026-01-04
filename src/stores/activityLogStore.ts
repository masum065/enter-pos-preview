import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export type LogAction = 
  | "LOGIN" 
  | "LOGOUT" 
  | "SALE_CREATE" 
  | "REFUND" 
  | "STOCK_UPDATE" 
  | "PRICE_CHANGE";

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole?: string;
  ipAddress?: string;
  action: LogAction;
  entityId?: string;
  details: string;
  before?: any;
  after?: any;
}

interface ActivityLogState {
  logs: ActivityLog[];
  addLog: (log: Omit<ActivityLog, "id" | "timestamp">) => void;
  setIP: (ip: string) => void;
  currentIP: string;
  clearLogs: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      currentIP: "Unknown",
      setIP: (ip) => set({ currentIP: ip }),
      addLog: (logData) => {
        const newLog: ActivityLog = {
          ...logData,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          ipAddress: logData.ipAddress || (get() as any).currentIP,
        };
        set((state) => ({
          // Keep only last 1000 logs for performance (Principle #10: Log is not permanent)
          logs: [newLog, ...state.logs].slice(0, 1000),
        }));
      },
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "activity-logs",
    }
  )
);
