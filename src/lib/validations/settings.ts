import { z } from "zod";

// Shop settings schema
export const shopSettingsSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  shopAddress: z.string().optional(),
  shopPhone: z.string().optional(),
  shopEmail: z.string().email().optional().or(z.literal("")),
  taxPercent: z.number().min(0).max(100).default(0),
  currency: z.string().default("৳"),
  invoicePrefix: z.string().default("INV"),
  expensePrefix: z.string().default("EXP"),
  servicePrefix: z.string().default("SRV"),
});

// User creation schema
export const createUserSchema = z.object({
  userId: z.string().min(3, "User ID must be at least 3 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "manager", "cashier", "employee"]),
});

// User update schema (no password required)
export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "manager", "cashier", "employee"]),
  isActive: z.boolean().default(true),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
