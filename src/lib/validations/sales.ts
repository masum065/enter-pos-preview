import { z } from "zod";

// Payment method enum
export const paymentMethodEnum = z.enum([
  "Cash",
  "Bkash",
  "Nagad",
  "Card",
  "Bank Transfer",
  "Other",
]);

// Sale item schema
export const saleItemSchema = z.object({
  stockItemId: z.string().uuid("Invalid stock item ID"),
  salePrice: z.string().or(z.number()).transform(val => String(val)),
  discount: z.string().or(z.number()).transform(val => String(val)).default("0"),
  quantity: z.number().int().min(1).default(1),
});

// Payment schema
export const paymentSchema = z.object({
  method: paymentMethodEnum,
  amount: z.string().or(z.number()).transform(val => String(val)),
  reference: z.string().optional(),
});

// Sale creation schema
export const createSaleSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  discountAmount: z.string().or(z.number()).transform(val => String(val)).default("0"),
  taxPercent: z.string().or(z.number()).transform(val => String(val)).default("0"),
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
  notes: z.string().optional(),
});

// Add payment schema
export const addPaymentSchema = z.object({
  method: paymentMethodEnum,
  amount: z.string().or(z.number()).transform(val => String(val)),
  reference: z.string().optional(),
});

// Return item schema
export const returnItemSchema = z.object({
  saleItemId: z.string().uuid("Invalid sale item ID"),
  reason: z.string().min(1, "Reason is required"),
  stockDestination: z.enum(["Available", "Damaged", "Returned"]).default("Returned"),
});

// Process return schema
export const processReturnSchema = z.object({
  items: z.array(returnItemSchema).min(1, "At least one item to return is required"),
  refundMethod: paymentMethodEnum,
  refundAmount: z.string().or(z.number()).transform(val => String(val)),
  reason: z.string().min(1, "Return reason is required"),
});

// Export types
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type ReturnItemInput = z.infer<typeof returnItemSchema>;
export type ProcessReturnInput = z.infer<typeof processReturnSchema>;
