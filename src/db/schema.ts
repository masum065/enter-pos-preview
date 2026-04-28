import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, integer, json, inet, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'employee']);

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  posPin: varchar('pos_pin', { length: 255 }),
  lockEnabled: boolean('lock_enabled').default(false).notNull(),
  lockTimeoutMinutes: integer('lock_timeout_minutes').default(5).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_users_user_id').on(table.userId),
  roleIdx: index('idx_users_role').on(table.role),
}));

// ============================================
// PRODUCTS
// ============================================

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: varchar('model_name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  specifications: text('specifications'),
  defaultSalePrice: decimal('default_sale_price', { precision: 12, scale: 2 }).notNull(),
  warranty: varchar('warranty', { length: 255 }),
  imageUrl: text('image_url'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('idx_products_category').on(table.category),
  brandIdx: index('idx_products_brand').on(table.brand),
  isDeletedIdx: index('idx_products_is_deleted').on(table.isDeleted),
}));

// ============================================
// CUSTOMERS
// ============================================

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  nid: varchar('nid', { length: 50 }),
  notes: text('notes'),
  totalPurchases: decimal('total_purchases', { precision: 12, scale: 2 }).default('0').notNull(),
  totalPaid: decimal('total_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  documents: json('documents').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  phoneIdx: index('idx_customers_phone').on(table.phone),
  nameIdx: index('idx_customers_name').on(table.name),
}));

export const customerTransactions = pgTable('customer_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // sale, payment, return
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  reference: varchar('reference', { length: 255 }),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  customerIdIdx: index('idx_customer_transactions_customer_id').on(table.customerId),
  createdAtIdx: index('idx_customer_transactions_created_at').on(table.createdAt),
}));

// ============================================
// SUPPLIERS
// ============================================

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  totalPurchases: decimal('total_purchases', { precision: 12, scale: 2 }).default('0').notNull(),
  totalPaid: decimal('total_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyNameIdx: index('idx_suppliers_company_name').on(table.companyName),
}));

export const supplierTransactions = pgTable('supplier_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  reference: varchar('reference', { length: 255 }),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  supplierIdIdx: index('idx_supplier_transactions_supplier_id').on(table.supplierId),
  createdAtIdx: index('idx_supplier_transactions_created_at').on(table.createdAt),
}));

// ============================================
// STOCK ITEMS
// ============================================

export const stockItems = pgTable('stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
  imei: varchar('imei', { length: 50 }),
  productId: uuid('product_id').notNull().references(() => products.id),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }).notNull(),
  purchaseSource: varchar('purchase_source', { length: 20 }).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: varchar('supplier_name', { length: 255 }),
  sellerId: uuid('seller_id').references(() => customers.id),
  purchaseDate: timestamp('purchase_date', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  saleId: uuid('sale_id'),
  serviceId: uuid('service_id'),
  soldAt: timestamp('sold_at', { withTimezone: true }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serialNumberIdx: uniqueIndex('idx_stock_items_serial_number').on(table.serialNumber),
  productIdIdx: index('idx_stock_items_product_id').on(table.productId),
  statusIdx: index('idx_stock_items_status').on(table.status),
  purchaseSourceIdx: index('idx_stock_items_purchase_source').on(table.purchaseSource),
}));

// ============================================
// SALES
// ============================================

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }).notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  grandTotal: decimal('grand_total', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  dueAmount: decimal('due_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  totalProfit: decimal('total_profit', { precision: 12, scale: 2 }).notNull(),
  totalReturned: decimal('total_returned', { precision: 12, scale: 2 }).default('0').notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  invoiceNumberIdx: uniqueIndex('idx_sales_invoice_number').on(table.invoiceNumber),
  customerIdIdx: index('idx_sales_customer_id').on(table.customerId),
  invoiceDateIdx: index('idx_sales_invoice_date').on(table.invoiceDate),
  statusIdx: index('idx_sales_status').on(table.status),
  createdByIdx: index('idx_sales_created_by').on(table.createdBy),
}));

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  stockItemId: uuid('stock_item_id').notNull().references(() => stockItems.id),
  serialNumber: varchar('serial_number', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  warranty: varchar('warranty', { length: 255 }),
  quantity: integer('quantity').default(1).notNull(),
  salePrice: decimal('sale_price', { precision: 12, scale: 2 }).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  profit: decimal('profit', { precision: 12, scale: 2 }).notNull(),
  isReturned: boolean('is_returned').default(false).notNull(),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
}, (table) => ({
  saleIdIdx: index('idx_sale_items_sale_id').on(table.saleId),
  productIdIdx: index('idx_sale_items_product_id').on(table.productId),
  stockItemIdIdx: index('idx_sale_items_stock_item_id').on(table.stockItemId),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reference: varchar('reference', { length: 255 }),
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  saleIdIdx: index('idx_payments_sale_id').on(table.saleId),
  paidAtIdx: index('idx_payments_paid_at').on(table.paidAt),
}));

export const saleReturns = pgTable('sale_returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id),
  totalReturnAmount: decimal('total_return_amount', { precision: 12, scale: 2 }).notNull(),
  refundMethod: varchar('refund_method', { length: 30 }).notNull(),
  refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  processedBy: uuid('processed_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  saleIdIdx: index('idx_sale_returns_sale_id').on(table.saleId),
}));

export const saleReturnItems = pgTable('sale_return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id').notNull().references(() => saleReturns.id, { onDelete: 'cascade' }),
  saleItemId: uuid('sale_item_id').notNull().references(() => saleItems.id),
  serialNumber: varchar('serial_number', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  returnAmount: decimal('return_amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
}, (table) => ({
  returnIdIdx: index('idx_sale_return_items_return_id').on(table.returnId),
}));

// ============================================
// PURCHASE INVOICES (Local Purchases)
// ============================================

export const purchaseInvoices = pgTable('purchase_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  purchaseDate: timestamp('purchase_date', { withTimezone: true }).notNull(),
  sellerId: uuid('seller_id').notNull().references(() => customers.id),
  sellerName: varchar('seller_name', { length: 255 }).notNull(),
  sellerPhone: varchar('seller_phone', { length: 20 }).notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull(),
  imei: varchar('imei', { length: 50 }),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  stockItemId: uuid('stock_item_id').notNull().references(() => stockItems.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  invoiceNumberIdx: uniqueIndex('idx_purchase_invoices_invoice_number').on(table.invoiceNumber),
  sellerIdIdx: index('idx_purchase_invoices_seller_id').on(table.sellerId),
  purchaseDateIdx: index('idx_purchase_invoices_purchase_date').on(table.purchaseDate),
}));

// ============================================
// SERVICE RECORDS
// ============================================

export const serviceRecords = pgTable('service_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceNumber: varchar('service_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  deviceType: varchar('device_type', { length: 20 }).notNull(),
  deviceBrand: varchar('device_brand', { length: 100 }).notNull(),
  deviceModel: varchar('device_model', { length: 255 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }),
  imei: varchar('imei', { length: 50 }),
  problemDescription: text('problem_description').notNull(),
  diagnosis: text('diagnosis'),
  solutionApplied: text('solution_applied'),
  receivedDate: timestamp('received_date', { withTimezone: true }).notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  deliveredDate: timestamp('delivered_date', { withTimezone: true }),
  estimatedCost: decimal('estimated_cost', { precision: 12, scale: 2 }).notNull(),
  serviceCharge: decimal('service_charge', { precision: 12, scale: 2 }).notNull(),
  partsCost: decimal('parts_cost', { precision: 12, scale: 2 }).default('0').notNull(),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  dueAmount: decimal('due_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  technicianNotes: text('technician_notes'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serviceNumberIdx: uniqueIndex('idx_service_records_service_number').on(table.serviceNumber),
  customerIdIdx: index('idx_service_records_customer_id').on(table.customerId),
  statusIdx: index('idx_service_records_status').on(table.status),
  receivedDateIdx: index('idx_service_records_received_date').on(table.receivedDate),
}));

// ============================================
// EXPENSES
// ============================================

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseNumber: varchar('expense_number', { length: 50 }).notNull().unique(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  description: text('description').notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paidBy: varchar('paid_by', { length: 100 }).notNull(),
  receipt: text('receipt'),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  expenseNumberIdx: uniqueIndex('idx_expenses_expense_number').on(table.expenseNumber),
  dateIdx: index('idx_expenses_date').on(table.date),
  categoryIdx: index('idx_expenses_category').on(table.category),
}));

// ============================================
// ACTIVITY LOGS (Audit Trail)
// ============================================

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  userName: varchar('user_name', { length: 255 }).notNull(),
  userRole: varchar('user_role', { length: 20 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  details: text('details').notNull(),
  beforeData: json('before_data'),
  afterData: json('after_data'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_activity_logs_user_id').on(table.userId),
  actionIdx: index('idx_activity_logs_action').on(table.action),
  createdAtIdx: index('idx_activity_logs_created_at').on(table.createdAt),
  entityIdIdx: index('idx_activity_logs_entity_id').on(table.entityId),
}));

// ============================================
// SETTINGS
// ============================================

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: json('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// RELATIONS (for Drizzle Query API)
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  createdProducts: many(products),
  createdStockItems: many(stockItems),
  createdSales: many(sales),
  createdPurchaseInvoices: many(purchaseInvoices),
  createdServiceRecords: many(serviceRecords),
  createdExpenses: many(expenses),
  activityLogs: many(activityLogs),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  stockItems: many(stockItems),
  saleItems: many(saleItems),
  purchaseInvoices: many(purchaseInvoices),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  purchaseInvoices: many(purchaseInvoices),
  stockItems: many(stockItems),
  serviceRecords: many(serviceRecords),
  transactions: many(customerTransactions),
}));

export const customerTransactionsRelations = relations(customerTransactions, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTransactions.customerId],
    references: [customers.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  stockItems: many(stockItems),
  transactions: many(supplierTransactions),
}));

export const stockItemsRelations = relations(stockItems, ({ one, many }) => ({
  product: one(products, {
    fields: [stockItems.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [stockItems.supplierId],
    references: [suppliers.id],
  }),
  seller: one(customers, {
    fields: [stockItems.sellerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [stockItems.createdBy],
    references: [users.id],
  }),
  sale: one(sales, {
    fields: [stockItems.saleId],
    references: [sales.id],
  }),
  saleItems: many(saleItems),
  purchaseInvoices: many(purchaseInvoices),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [sales.createdBy],
    references: [users.id],
  }),
  items: many(saleItems),
  payments: many(payments),
  returns: many(saleReturns),
  stockItems: many(stockItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  stockItem: one(stockItems, {
    fields: [saleItems.stockItemId],
    references: [stockItems.id],
  }),
  returnItems: many(saleReturnItems),
}));
