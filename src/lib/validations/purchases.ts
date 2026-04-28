import { z } from "zod";

// Customer schema
export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().nullable().optional().or(z.literal("")).or(z.literal(null)),
  address: z.string().nullable().optional(),
  nid: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  documents: z.array(z.any()).nullable().optional().default([]),
});

// Supplier schema
export const supplierSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Supplier payment schema
export const supplierPaymentSchema = z.object({
  amount: z.string().or(z.number()).transform(val => String(val)),
  reference: z.string().optional(),
  description: z.string().optional(),
});

// Purchase invoice schema
export const purchaseInvoiceSchema = z.object({
  purchaseDate: z.string().or(z.date()).transform(val =>
    val instanceof Date ? val : new Date(val)
  ),
  sellerId: z.string().uuid("Invalid seller ID"),
  sellerName: z.string().min(1, "Seller name is required"),
  sellerPhone: z.string().min(1, "Seller phone is required"),
  productId: z.string().uuid("Invalid product ID"),
  productName: z.string().min(1, "Product name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  imei: z.string().optional(),
  purchasePrice: z.string().or(z.number()).transform(val => String(val)),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paidAmount: z.string().or(z.number()).transform(val => String(val)),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;
