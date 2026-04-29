import { z } from "zod";

// Service status workflow: Received → Diagnosing → Waiting for Parts → In Progress → Completed → Delivered
export const serviceStatusEnum = z.enum([
  "Received",
  "Diagnosing",
  "Waiting for Parts",
  "In Progress",
  "Completed",
  "Delivered",
  "Cancelled",
]);

export const paymentStatusEnum = z.enum(["Pending", "Partial", "Paid"]);

export const deviceTypeEnum = z.enum(["Laptop", "Mobile", "Tablet", "Other"]);

// Service record creation schema
export const serviceRecordSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  deviceType: deviceTypeEnum,
  deviceBrand: z.string().min(1, "Device brand is required"),
  deviceModel: z.string().min(1, "Device model is required"),
  serialNumber: z.string().optional(),
  imei: z.string().optional(),
  problemDescription: z.string().min(1, "Problem description is required"),
  diagnosis: z.string().optional(),
  solutionApplied: z.string().optional(),
  receivedDate: z.string().or(z.date()).transform(val => val instanceof Date ? val : new Date(val)),
  expectedDeliveryDate: z.string().or(z.date()).transform(val => val instanceof Date ? val : new Date(val)).optional(),
  estimatedCost: z.string().or(z.number()).transform(val => String(val)),
  serviceCharge: z.string().or(z.number()).transform(val => String(val)),
  partsCost: z.string().or(z.number()).transform(val => String(val)).default("0"),
  totalCost: z.string().or(z.number()).transform(val => String(val)),
  status: serviceStatusEnum.default("Received"),
  paymentStatus: paymentStatusEnum.default("Pending"),
  paidAmount: z.string().or(z.number()).transform(val => String(val)).default("0"),
  dueAmount: z.string().or(z.number()).transform(val => String(val)),
  notes: z.string().optional(),
  technicianNotes: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

// Service status update schema
export const serviceStatusUpdateSchema = z.object({
  status: serviceStatusEnum,
});

// Service payment schema
export const servicePaymentSchema = z.object({
  amount: z.string().or(z.number()).transform(val => String(val)),
});

// Expense categories
export const expenseCategoryEnum = z.string().min(1, "Category is required");

export const paymentMethodEnum = z.enum([
  "Cash", "Bkash", "Nagad", "Card", "Bank Transfer", "Other",
]);

// Expense creation schema
export const expenseSchema = z.object({
  date: z.string().or(z.date()).transform(val => val instanceof Date ? val : new Date(val)),
  category: expenseCategoryEnum,
  description: z.string().min(1, "Description is required"),
  paymentMethod: paymentMethodEnum,
  amount: z.string().or(z.number()).transform(val => String(val)),
  paidBy: z.string().min(1, "Paid by is required"),
  receipt: z.string().optional(),
  notes: z.string().optional(),
});

export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;
export type ServiceStatusUpdateInput = z.infer<typeof serviceStatusUpdateSchema>;
export type ServicePaymentInput = z.infer<typeof servicePaymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
