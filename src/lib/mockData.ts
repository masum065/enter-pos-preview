// Mock data generators for Enter Computer POS
// This file provides sample data for testing and demo purposes

import { Customer } from "@/stores/customerStore";
import { Product, ProductCategory } from "@/stores/productStore";
import { StockItem, StockStatus } from "@/stores/stockStore";
import { Sale, SaleItem, Payment, PaymentMethod } from "@/stores/salesStore";
import { ServiceRecord, ServiceStatus, PaymentStatus } from "@/stores/serviceStore";
import { Expense, ExpenseCategory } from "@/stores/expenseStore";

// Helper to generate IDs
const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Random date within last N days
const randomDate = (daysBack: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString();
};

// Random item from array
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Random number between min and max
const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ============ CUSTOMERS ============
const CUSTOMER_NAMES = [
  "Md. Rahim Uddin",
  "Fatima Begum",
  "Kamrul Hasan",
  "Nasreen Akter",
  "Abdul Karim",
  "Shamima Parvin",
  "Jahangir Alam",
  "Rashida Khatun",
  "Sohel Rana",
  "Monira Begum",
  "Aminul Islam",
  "Taslima Akter",
  "Rafiqul Islam",
  "Salma Begum",
  "Mizanur Rahman",
  "Rokeya Sultana",
  "Habibur Rahman",
  "Sultana Razia",
  "Shafiqul Islam",
  "Ayesha Siddika",
];

const ADDRESSES = [
  "Mirpur, Dhaka",
  "Uttara, Dhaka",
  "Dhanmondi, Dhaka",
  "Gulshan, Dhaka",
  "Banani, Dhaka",
  "Mohammadpur, Dhaka",
  "Motijheel, Dhaka",
  "Farmgate, Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Rangpur",
  "Comilla",
  "Gazipur",
];

export const generateMockCustomers = (count: number = 50): Customer[] => {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = randomDate(180);
    return {
      id: generateId("cust"),
      name: randomFrom(CUSTOMER_NAMES) + (i > 19 ? ` ${i}` : ""),
      phone: `017${randomBetween(10000000, 99999999)}`,
      email: i % 3 === 0 ? `customer${i + 1}@email.com` : undefined,
      address: randomFrom(ADDRESSES),
      nid: i % 2 === 0 ? `${randomBetween(1000000000, 9999999999)}` : undefined,
      notes: i % 5 === 0 ? "Regular customer" : undefined,
      createdAt,
      updatedAt: createdAt,
    };
  });
};

// ============ PRODUCTS ============
interface ProductTemplate {
  modelName: string;
  brand: string;
  category: ProductCategory;
  description: string;
  defaultSalePrice: number;
  warranty: string;
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Laptops
  { modelName: "MacBook Pro 14 M3", brand: "Apple", category: "Laptop", description: "14-inch, M3 Pro, 18GB RAM, 512GB SSD", defaultSalePrice: 295000, warranty: "12 Months Service & 7 Days Replacement" },
  { modelName: "MacBook Air M2", brand: "Apple", category: "Laptop", description: "13.6-inch, M2, 8GB RAM, 256GB SSD", defaultSalePrice: 145000, warranty: "12 Months Official" },
  { modelName: "ThinkPad X1 Carbon", brand: "Lenovo", category: "Laptop", description: "14-inch, i7-1365U, 16GB RAM, 512GB SSD", defaultSalePrice: 185000, warranty: "24 Months Service" },
  { modelName: "Dell XPS 15", brand: "Dell", category: "Laptop", description: "15.6-inch, i7-13700H, 16GB RAM, 512GB SSD", defaultSalePrice: 175000, warranty: "12 Months Official" },
  { modelName: "HP Spectre x360", brand: "HP", category: "Laptop", description: "14-inch, i7-1355U, 16GB RAM, 1TB SSD", defaultSalePrice: 165000, warranty: "12 Months Official" },
  { modelName: "ASUS ROG Strix G16", brand: "ASUS", category: "Laptop", description: "16-inch, i9-13980HX, RTX 4070, 32GB RAM", defaultSalePrice: 245000, warranty: "24 Months Service" },
  { modelName: "Acer Swift 3", brand: "Acer", category: "Laptop", description: "14-inch, i5-1340P, 8GB RAM, 512GB SSD", defaultSalePrice: 75000, warranty: "12 Months Service" },
  { modelName: "MSI Katana 15", brand: "MSI", category: "Laptop", description: "15.6-inch, i7-13620H, RTX 4060, 16GB RAM", defaultSalePrice: 145000, warranty: "12 Months Service" },
  
  // Mobiles
  { modelName: "iPhone 15 Pro Max", brand: "Apple", category: "Mobile", description: "256GB, Titanium Blue", defaultSalePrice: 185000, warranty: "12 Months Official" },
  { modelName: "iPhone 15", brand: "Apple", category: "Mobile", description: "128GB, Blue", defaultSalePrice: 125000, warranty: "12 Months Official" },
  { modelName: "Samsung Galaxy S24 Ultra", brand: "Samsung", category: "Mobile", description: "256GB, Titanium Gray", defaultSalePrice: 165000, warranty: "12 Months Official" },
  { modelName: "Samsung Galaxy A54", brand: "Samsung", category: "Mobile", description: "128GB, Awesome Graphite", defaultSalePrice: 45000, warranty: "12 Months Service" },
  { modelName: "Xiaomi 14", brand: "Xiaomi", category: "Mobile", description: "256GB, Black", defaultSalePrice: 85000, warranty: "12 Months Official" },
  { modelName: "OnePlus 12", brand: "OnePlus", category: "Mobile", description: "256GB, Flowy Emerald", defaultSalePrice: 95000, warranty: "12 Months Service" },
  { modelName: "Google Pixel 8 Pro", brand: "Google", category: "Mobile", description: "128GB, Obsidian", defaultSalePrice: 115000, warranty: "12 Months Official" },
  { modelName: "Realme GT 5 Pro", brand: "Realme", category: "Mobile", description: "256GB, Bright Moon", defaultSalePrice: 65000, warranty: "12 Months Service" },
  
  // Tablets
  { modelName: "iPad Pro 12.9 M2", brand: "Apple", category: "Tablet", description: "256GB, Wi-Fi, Space Gray", defaultSalePrice: 145000, warranty: "12 Months Official" },
  { modelName: "iPad Air M1", brand: "Apple", category: "Tablet", description: "64GB, Wi-Fi, Purple", defaultSalePrice: 85000, warranty: "12 Months Official" },
  { modelName: "Samsung Galaxy Tab S9+", brand: "Samsung", category: "Tablet", description: "256GB, Graphite", defaultSalePrice: 95000, warranty: "12 Months Service" },
  
  // Accessories
  { modelName: "AirPods Pro 2", brand: "Apple", category: "Accessories", description: "with MagSafe Charging Case", defaultSalePrice: 32000, warranty: "12 Months Official" },
  { modelName: "Magic Keyboard", brand: "Apple", category: "Accessories", description: "with Touch ID, US English", defaultSalePrice: 18000, warranty: "12 Months Official" },
  { modelName: "Logitech MX Master 3S", brand: "Logitech", category: "Accessories", description: "Wireless Mouse, Graphite", defaultSalePrice: 12000, warranty: "24 Months Service" },
  { modelName: "Samsung T7 SSD 1TB", brand: "Samsung", category: "Accessories", description: "Portable SSD, USB 3.2", defaultSalePrice: 12000, warranty: "36 Months Service" },
  { modelName: "Anker PowerBank 20000mAh", brand: "Anker", category: "Accessories", description: "65W USB-C, Black", defaultSalePrice: 5500, warranty: "18 Months Service" },
];

export const generateMockProducts = (): Product[] => {
  return PRODUCT_TEMPLATES.map((template) => {
    const createdAt = randomDate(365);
    return {
      id: generateId("prod"),
      ...template,
      createdAt,
      updatedAt: createdAt,
    };
  });
};

// ============ STOCK ITEMS ============
const generateSerial = (prefix: string): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let serial = prefix;
  for (let i = 0; i < 8; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return serial;
};

const SUPPLIERS = [
  "Apple BD Authorized",
  "Samsung Official",
  "Tech Vision Ltd.",
  "Computer Village",
  "Global Tech Hub",
  "Digital World",
  "IT Solutions BD",
  "Smart Gadget Zone",
];

export const generateMockStock = (products: Product[], countPerProduct: number = 5): StockItem[] => {
  const stock: StockItem[] = [];
  
  products.forEach((product) => {
    const itemCount = randomBetween(2, countPerProduct);
    
    for (let i = 0; i < itemCount; i++) {
      const createdAt = randomDate(90);
      const marginPercent = randomBetween(5, 15);
      const purchasePrice = Math.round(product.defaultSalePrice * (1 - marginPercent / 100));
      
      // Most items available, some sold
      const statusOptions: StockStatus[] = ["Available", "Available", "Available", "Available", "Sold"];
      const status = randomFrom(statusOptions);
      
      const serialPrefix = product.category === "Mobile" ? "IMEI" : "SN";
      
      stock.push({
        id: generateId("stock"),
        serialNumber: generateSerial(serialPrefix),
        imei: product.category === "Mobile" ? generateSerial("35") : undefined,
        productId: product.id,
        purchasePrice,
        supplierName: randomFrom(SUPPLIERS),
        purchaseDate: createdAt,
        status,
        soldAt: status === "Sold" ? randomDate(30) : undefined,
        createdAt,
        updatedAt: createdAt,
      });
    }
  });
  
  return stock;
};

// ============ SALES ============
const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bkash", "Nagad", "Card", "Bank Transfer"];

export const generateMockSales = (
  customers: Customer[],
  products: Product[],
  stockItems: StockItem[],
  count: number = 30
): Sale[] => {
  const sales: Sale[] = [];
  let invoiceCounter = 1;
  
  // Get only sold stock items for sales
  const soldStock = stockItems.filter((s) => s.status === "Sold");
  
  for (let i = 0; i < Math.min(count, soldStock.length); i++) {
    const customer = randomFrom(customers);
    const stock = soldStock[i];
    const product = products.find((p) => p.id === stock.productId);
    
    if (!product) continue;
    
    const salePrice = product.defaultSalePrice;
    const discount = randomBetween(0, 5) === 0 ? randomBetween(500, 5000) : 0;
    const amount = salePrice - discount;
    const profit = amount - stock.purchasePrice;
    
    const invoiceDate = stock.soldAt || randomDate(60);
    const grandTotal = amount;
    const paidAmount = randomBetween(0, 10) < 8 ? grandTotal : grandTotal - randomBetween(1000, 10000);
    const dueAmount = grandTotal - paidAmount;
    
    const saleItem: SaleItem = {
      id: generateId("item"),
      productId: product.id,
      stockItemId: stock.id,
      serialNumber: stock.serialNumber,
      productName: `${product.brand} ${product.modelName}`,
      warranty: product.warranty,
      quantity: 1,
      salePrice,
      purchasePrice: stock.purchasePrice,
      discount,
      amount,
      profit,
    };
    
    const payments: Payment[] = [];
    if (paidAmount > 0) {
      payments.push({
        id: generateId("pay"),
        method: randomFrom(PAYMENT_METHODS),
        amount: paidAmount,
        paidAt: invoiceDate,
      });
    }
    
    sales.push({
      id: generateId("sale"),
      invoiceNumber: `INV-${new Date(invoiceDate).getFullYear()}-${invoiceCounter.toString().padStart(4, "0")}`,
      invoiceDate,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [saleItem],
      subtotal: salePrice,
      discountAmount: discount,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal,
      payments,
      paidAmount,
      dueAmount,
      totalProfit: profit,
      status: dueAmount === 0 ? "completed" : "partial",
      createdBy: "admin",
      createdAt: invoiceDate,
      updatedAt: invoiceDate,
    });
    
    invoiceCounter++;
  }
  
  return sales;
};

// ============ SERVICES ============
const DEVICE_PROBLEMS = [
  "Screen replacement needed",
  "Battery not charging",
  "Keyboard not working",
  "Speaker issue",
  "Camera not working",
  "Slow performance",
  "Virus removal needed",
  "Water damage repair",
  "Power button not working",
  "Wifi connectivity issue",
  "Display flickering",
  "Touchpad not responding",
];

const SERVICE_STATUSES: ServiceStatus[] = [
  "Received",
  "Diagnosing",
  "Waiting for Parts",
  "In Progress",
  "Completed",
  "Delivered",
];

export const generateMockServices = (customers: Customer[], count: number = 20): ServiceRecord[] => {
  const services: ServiceRecord[] = [];
  let serviceCounter = 1;
  
  for (let i = 0; i < count; i++) {
    const customer = randomFrom(customers);
    const deviceType = randomFrom(["Laptop", "Mobile", "Tablet"] as const);
    const brand = randomFrom(["Apple", "Samsung", "Lenovo", "Dell", "HP", "Xiaomi"]);
    const model = `${brand} ${deviceType === "Laptop" ? "Laptop" : deviceType}`;
    
    const receivedDate = randomDate(30);
    const status = randomFrom(SERVICE_STATUSES);
    const serviceCharge = randomBetween(1000, 10000);
    const partsCost = randomBetween(0, 5000);
    const totalCost = serviceCharge + partsCost;
    
    const paidAmount = status === "Delivered" ? totalCost : 
                       status === "Completed" ? randomBetween(0, totalCost) : 
                       randomBetween(0, totalCost / 2);
    const dueAmount = totalCost - paidAmount;
    const paymentStatus: PaymentStatus = dueAmount === 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";
    
    services.push({
      id: generateId("srv"),
      serviceNumber: `SRV-${new Date(receivedDate).getFullYear()}-${serviceCounter.toString().padStart(4, "0")}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deviceType,
      deviceBrand: brand,
      deviceModel: model,
      serialNumber: generateSerial("SN"),
      problemDescription: randomFrom(DEVICE_PROBLEMS),
      receivedDate,
      expectedDeliveryDate: new Date(new Date(receivedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completedDate: status === "Completed" || status === "Delivered" ? randomDate(10) : undefined,
      deliveredDate: status === "Delivered" ? randomDate(5) : undefined,
      estimatedCost: totalCost,
      serviceCharge,
      partsCost,
      totalCost,
      status,
      paymentStatus,
      paidAmount,
      dueAmount,
      createdBy: "admin",
      createdAt: receivedDate,
      updatedAt: receivedDate,
    });
    
    serviceCounter++;
  }
  
  return services;
};

// ============ EXPENSES ============
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Salary",
  "Purchase/Stock",
  "Utilities",
  "Service Parts",
  "Transportation",
  "Tea/Snacks",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];

const EXPENSE_DESCRIPTIONS: Record<ExpenseCategory, string[]> = {
  "Rent": ["Monthly shop rent", "Godown rent"],
  "Salary": ["Staff salary", "Technician salary", "Accountant salary"],
  "Purchase/Stock": ["Stock purchase advance", "Import charges"],
  "Utilities": ["Electricity bill", "Internet bill", "Water bill", "Gas bill"],
  "Service Parts": ["Spare parts purchase", "Screen purchase", "Battery purchase"],
  "Transportation": ["Delivery cost", "Courier charge", "Fuel cost"],
  "Tea/Snacks": ["Staff tea", "Customer hospitality", "Lunch expense"],
  "Office Supplies": ["Stationery", "Printer ink", "Cleaning supplies"],
  "Marketing": ["Facebook ads", "Banner printing", "Promotional items"],
  "Maintenance": ["AC repair", "Shop maintenance", "Equipment repair"],
  "Miscellaneous": ["Miscellaneous expense", "Petty cash", "Emergency expense"],
};

export const generateMockExpenses = (count: number = 40): Expense[] => {
  const expenses: Expense[] = [];
  let expenseCounter = 1;
  
  for (let i = 0; i < count; i++) {
    const category = randomFrom(EXPENSE_CATEGORIES);
    const date = randomDate(90);
    const descriptions = EXPENSE_DESCRIPTIONS[category];
    
    // Set amount ranges based on category
    let minAmount = 100;
    let maxAmount = 5000;
    
    if (category === "Rent") {
      minAmount = 20000;
      maxAmount = 50000;
    } else if (category === "Salary") {
      minAmount = 10000;
      maxAmount = 30000;
    } else if (category === "Purchase/Stock") {
      minAmount = 10000;
      maxAmount = 100000;
    } else if (category === "Utilities") {
      minAmount = 1000;
      maxAmount = 10000;
    }
    
    expenses.push({
      id: generateId("exp"),
      expenseNumber: `EXP-${new Date(date).getFullYear()}-${expenseCounter.toString().padStart(4, "0")}`,
      date,
      category,
      description: randomFrom(descriptions),
      paymentMethod: randomFrom(PAYMENT_METHODS),
      amount: randomBetween(minAmount, maxAmount),
      paidBy: randomFrom(["Admin", "Manager", "Cashier"]),
      createdBy: "admin",
      createdAt: date,
      updatedAt: date,
    });
    
    expenseCounter++;
  }
  
  return expenses;
};

// ============ MASTER FUNCTION ============
export interface MockData {
  customers: Customer[];
  products: Product[];
  stockItems: StockItem[];
  sales: Sale[];
  services: ServiceRecord[];
  expenses: Expense[];
}

export const generateAllMockData = (): MockData => {
  const customers = generateMockCustomers(50);
  const products = generateMockProducts();
  const stockItems = generateMockStock(products, 5);
  const sales = generateMockSales(customers, products, stockItems, 30);
  const services = generateMockServices(customers, 20);
  const expenses = generateMockExpenses(40);
  
  return {
    customers,
    products,
    stockItems,
    sales,
    services,
    expenses,
  };
};
