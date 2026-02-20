import { z } from "zod";

export const productSchema = z.object({
  modelName: z.string().min(1, "Model name is required"),
  brand: z.string().min(1, "Brand is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  specifications: z.string().optional(),
  defaultSalePrice: z.string().or(z.number()).transform(val => String(val)),
  warranty: z.string().optional(),
  imageUrl: z.string().optional(),
  isDeleted: z.boolean().default(false),
});

export const stockItemSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  imei: z.string().optional(),
  productId: z.string().uuid("Invalid product ID"),
  purchasePrice: z.string().or(z.number()).transform(val => String(val)),
  purchaseSource: z.enum(["supplier", "local"]),
  supplierId: z.string().uuid("Invalid supplier ID").optional().nullable(),
  supplierName: z.string().optional().nullable(),
  sellerId: z.string().uuid("Invalid seller ID").optional().nullable(),
  purchaseDate: z.string().or(z.date()).transform(val => 
    val instanceof Date ? val : new Date(val)
  ),
  status: z.string().default("available"),
  notes: z.string().optional().nullable(),
});

export const stockAdjustmentSchema = z.object({
  stockItemId: z.string().uuid("Invalid stock item ID"),
  status: z.string(),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type StockItemInput = z.infer<typeof stockItemSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
