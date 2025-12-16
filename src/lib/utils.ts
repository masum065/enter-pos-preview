import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with Bangladeshi Taka symbol
export const formatCurrency = (amount: number, symbol: string = "৳"): string => {
  return `${symbol}${amount.toLocaleString("en-BD")}`;
};

// Format date to readable string
export const formatDate = (dateStr: string, format: "short" | "long" | "datetime" = "short"): string => {
  const date = new Date(dateStr);
  
  if (format === "short") {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  
  if (format === "long") {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  
  // datetime
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format phone number for display
export const formatPhone = (phone: string): string => {
  // Format as: 017-1234-5678
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

// Generate unique ID
export const generateId = (prefix: string = "id"): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if date is today
export const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Check if date is this month
export const isThisMonth = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// Check if date is this week
export const isThisWeek = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  return date >= weekStart && date < weekEnd;
};

// Get relative time string
export const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return formatDate(dateStr);
};

// Debounce function
export const debounce = <T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
export const isEmpty = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

// Group array by key
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

// Calculate percentage
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Calculate profit margin
export const calculateProfitMargin = (salePrice: number, purchasePrice: number): number => {
  if (salePrice === 0) return 0;
  return Math.round(((salePrice - purchasePrice) / salePrice) * 100);
};

// Validate phone number (Bangladesh)
export const isValidBDPhone = (phone: string): boolean => {
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  return bdPhoneRegex.test(phone);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get status color class
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    // Sales status
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    returned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    partially_returned: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    
    // Stock status
    Available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Sold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Service: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    Returned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Damaged: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    
    // Service status
    Received: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    Diagnosing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "Waiting for Parts": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    "In Progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    
    // Payment status
    Paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Pending: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  
  return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
};

// Download data as JSON file
export const downloadJSON = (data: object, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Download data as CSV file
export const downloadCSV = (data: Array<Record<string, unknown>>, filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const cell = row[header];
        const cellStr = cell === null || cell === undefined ? "" : String(cell);
        // Escape quotes and wrap in quotes if contains comma or newline
        if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ),
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

