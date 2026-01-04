import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./authStore";
import { useActivityLogStore } from "./activityLogStore";

export type ServiceStatus = 
  | "Received" 
  | "Diagnosing" 
  | "Waiting for Parts" 
  | "In Progress" 
  | "Completed" 
  | "Delivered" 
  | "Cancelled";

export type PaymentStatus = "Pending" | "Partial" | "Paid";

export interface ServiceRecord {
  id: string;
  serviceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Device Info
  deviceType: "Laptop" | "Mobile" | "Tablet" | "Other";
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  imei?: string;
  
  // Problem & Solution
  problemDescription: string;
  diagnosis?: string;
  solutionApplied?: string;
  
  // Dates
  receivedDate: string;
  expectedDeliveryDate?: string;
  completedDate?: string;
  deliveredDate?: string;
  
  // Costs
  estimatedCost: number;
  serviceCharge: number;
  partsCost: number;
  totalCost: number;
  
  // Status
  status: ServiceStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueAmount: number;
  
  // Additional
  notes?: string;
  technicianNotes?: string;
  assignedTo?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceState {
  services: ServiceRecord[];
  serviceCounter: number;
  isLoading: boolean;

  // Actions
  createService: (data: Omit<ServiceRecord, "id" | "serviceNumber" | "createdAt" | "updatedAt">) => ServiceRecord;
  updateService: (id: string, data: Partial<ServiceRecord>) => boolean;
  deleteService: (id: string) => boolean;
  
  // Status updates
  updateServiceStatus: (id: string, status: ServiceStatus) => boolean;
  addPayment: (id: string, amount: number) => boolean;
  
  // Queries
  getServiceById: (id: string) => ServiceRecord | undefined;
  getServiceByNumber: (serviceNumber: string) => ServiceRecord | undefined;
  getServicesByStatus: (status: ServiceStatus) => ServiceRecord[];
  getServicesByCustomer: (customerId: string) => ServiceRecord[];
  getPendingServices: () => ServiceRecord[];
  getCompletedServices: () => ServiceRecord[];
  getRecentServices: (limit?: number) => ServiceRecord[];
  
  // Stats
  generateServiceNumber: () => string;
  getPendingServicesCount: () => number;
  getTotalServiceRevenue: () => number;
  getServicesWithDue: () => ServiceRecord[];
}

const generateId = () => `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      services: [],
      serviceCounter: 1,
      isLoading: false,

      createService: (data) => {
        const now = new Date().toISOString();
        const serviceNumber = get().generateServiceNumber();
        
        const newService: ServiceRecord = {
          ...data,
          id: generateId(),
          serviceNumber,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          services: [newService, ...state.services],
          serviceCounter: state.serviceCounter + 1,
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE", // Using STOCK_UPDATE for general inventory/service actions in the absence of a specific service action type
          entityId: newService.id,
          details: `New service record created: ${newService.serviceNumber} for ${newService.customerName}`,
          after: newService
        });

        return newService;
      },

      updateService: (id, data) => {
        const state = get();
        const index = state.services.findIndex((s) => s.id === id);
        
        if (index === -1) return false;

        const oldService = state.services[index];

        const updatedService = {
          ...oldService,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          services: state.services.map((s) => (s.id === id ? updatedService : s)),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Updated service record ${oldService.serviceNumber}`,
          before: oldService,
          after: updatedService
        });

        return true;
      },

      deleteService: (id) => {
        const state = get();
        const service = state.services.find((s) => s.id === id);
        
        if (!service) return false;

        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Deleted service record: ${service.serviceNumber}`,
          before: service
        });

        return true;
      },

      updateServiceStatus: (id, status) => {
        const updates: Partial<ServiceRecord> = { status };
        
        if (status === "Completed") {
          updates.completedDate = new Date().toISOString();
        } else if (status === "Delivered") {
          updates.deliveredDate = new Date().toISOString();
        }

        // updateService will handle the logging
        return get().updateService(id, updates);
      },

      addPayment: (id, amount) => {
        const service = get().getServiceById(id);
        if (!service) return false;

        const newPaidAmount = service.paidAmount + amount;
        const newDueAmount = service.totalCost - newPaidAmount;
        const newPaymentStatus: PaymentStatus = 
          newDueAmount <= 0 ? "Paid" : 
          newPaidAmount > 0 ? "Partial" : "Pending";

        // updateService will handle the logging
        return get().updateService(id, {
          paidAmount: newPaidAmount,
          dueAmount: Math.max(0, newDueAmount),
          paymentStatus: newPaymentStatus,
        });
      },

      getServiceById: (id) => {
        return get().services.find((s) => s.id === id);
      },

      getServiceByNumber: (serviceNumber) => {
        return get().services.find((s) => s.serviceNumber === serviceNumber);
      },

      getServicesByStatus: (status) => {
        return get().services.filter((s) => s.status === status);
      },

      getServicesByCustomer: (customerId) => {
        return get().services.filter((s) => s.customerId === customerId);
      },

      getPendingServices: () => {
        const completedStatuses: ServiceStatus[] = ["Delivered", "Cancelled"];
        return get().services.filter((s) => !completedStatuses.includes(s.status));
      },

      getCompletedServices: () => {
        return get().services.filter((s) => s.status === "Completed" || s.status === "Delivered");
      },

      getRecentServices: (limit = 10) => {
        return get()
          .services.slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },

      generateServiceNumber: () => {
        const year = new Date().getFullYear();
        const counter = get().serviceCounter;
        return `SRV-${year}-${counter.toString().padStart(4, "0")}`;
      },

      getPendingServicesCount: () => {
        return get().getPendingServices().length;
      },

      getTotalServiceRevenue: () => {
        return get()
          .services.filter((s) => s.status === "Delivered")
          .reduce((sum, s) => sum + s.paidAmount, 0);
      },

      getServicesWithDue: () => {
        return get().services.filter((s) => s.dueAmount > 0 && s.status !== "Cancelled");
      },
    }),
    {
      name: "enter-pos-services",
    }
  )
);
