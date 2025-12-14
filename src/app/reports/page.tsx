"use client";

import { useState, useMemo, useEffect } from "react";
import { useSalesStore } from "@/stores/salesStore";
import { useServiceStore } from "@/stores/serviceStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useStockStore } from "@/stores/stockStore";
import { useCustomerStore } from "@/stores/customerStore";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";

type ReportType = "sales" | "profit" | "inventory" | "service" | "expense";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [isLoaded, setIsLoaded] = useState(false);

  const salesStore = useSalesStore();
  const serviceStore = useServiceStore();
  const expenseStore = useExpenseStore();
  const stockStore = useStockStore();
  const customerStore = useCustomerStore();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Date filtering helper
  const filterByDate = <T extends { createdAt?: string; invoiceDate?: string; date?: string }>(
    items: T[],
    dateField: keyof T
  ): T[] => {
    if (dateRange === "all") return items;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return items.filter((item) => {
      const itemDate = new Date(item[dateField] as string);
      
      if (dateRange === "today") {
        return itemDate >= today;
      } else if (dateRange === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return itemDate >= weekAgo;
      } else if (dateRange === "month") {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      } else if (dateRange === "year") {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  // Sales Report Data
  const salesReport = useMemo(() => {
    const filtered = filterByDate(salesStore.sales, "invoiceDate");
    return {
      totalSales: filtered.length,
      totalRevenue: filtered.reduce((sum, s) => sum + s.grandTotal, 0),
      totalProfit: filtered.reduce((sum, s) => sum + s.totalProfit, 0),
      totalDue: filtered.reduce((sum, s) => sum + s.dueAmount, 0),
      avgOrderValue: filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.grandTotal, 0) / filtered.length) : 0,
      items: filtered.slice(0, 10),
    };
  }, [salesStore.sales, dateRange]);

  // Inventory Report Data
  const inventoryReport = useMemo(() => {
    const available = stockStore.stockItems.filter((s) => s.status === "Available");
    const sold = stockStore.stockItems.filter((s) => s.status === "Sold");
    const service = stockStore.stockItems.filter((s) => s.status === "Service");
    return {
      totalItems: stockStore.stockItems.length,
      available: available.length,
      sold: sold.length,
      inService: service.length,
      stockValue: available.reduce((sum, s) => sum + s.purchasePrice, 0),
    };
  }, [stockStore.stockItems]);

  // Service Report Data
  const serviceReport = useMemo(() => {
    const filtered = filterByDate(serviceStore.services, "createdAt");
    const completed = filtered.filter((s) => s.status === "Completed" || s.status === "Delivered");
    return {
      totalServices: filtered.length,
      completed: completed.length,
      pending: filtered.length - completed.length,
      totalRevenue: filtered.reduce((sum, s) => sum + s.totalCost, 0),
      totalDue: filtered.reduce((sum, s) => sum + s.dueAmount, 0),
    };
  }, [serviceStore.services, dateRange]);

  // Expense Report Data
  const expenseReport = useMemo(() => {
    const filtered = filterByDate(expenseStore.expenses, "date");
    const byCategory = expenseStore.getCategoryBreakdown();
    return {
      totalExpenses: filtered.length,
      totalAmount: filtered.reduce((sum, e) => sum + e.amount, 0),
      avgExpense: filtered.length > 0 ? Math.round(filtered.reduce((sum, e) => sum + e.amount, 0) / filtered.length) : 0,
      topCategories: byCategory.slice(0, 5),
    };
  }, [expenseStore.expenses, dateRange]);

  // Profit Report Data
  const profitReport = useMemo(() => {
    const salesFiltered = filterByDate(salesStore.sales, "invoiceDate");
    const expenseFiltered = filterByDate(expenseStore.expenses, "date");
    
    const totalRevenue = salesFiltered.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalProfit = salesFiltered.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalExpenses = expenseFiltered.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    
    return {
      totalRevenue,
      grossProfit: totalProfit,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
    };
  }, [salesStore.sales, expenseStore.expenses, dateRange]);

  // Export handlers
  const handleExport = () => {
    if (selectedReport === "sales") {
      const data = salesStore.sales.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: formatDate(s.invoiceDate),
        Customer: s.customerName,
        Total: s.grandTotal,
        Paid: s.paidAmount,
        Due: s.dueAmount,
        Profit: s.totalProfit,
        Status: s.status,
      }));
      downloadCSV(data, `sales-report-${new Date().toISOString().split("T")[0]}`);
    } else if (selectedReport === "expense") {
      const data = expenseStore.expenses.map((e) => ({
        Number: e.expenseNumber,
        Date: formatDate(e.date),
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Method: e.paymentMethod,
        PaidBy: e.paidBy,
      }));
      downloadCSV(data, `expense-report-${new Date().toISOString().split("T")[0]}`);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">Business analytics and insights</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["sales", "profit", "inventory", "service", "expense"] as ReportType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedReport(type)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
              selectedReport === type
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-2">
        {(["today", "week", "month", "year", "all"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all ${
              dateRange === range
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {range === "all" ? "All Time" : range === "week" ? "This Week" : range === "month" ? "This Month" : range === "year" ? "This Year" : "Today"}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* Sales Report */}
        {selectedReport === "sales" && (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{salesReport.totalSales}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(salesReport.totalRevenue)}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(salesReport.totalProfit)}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Due Amount</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(salesReport.totalDue)}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(salesReport.avgOrderValue)}</p>
              </div>
            </div>

            {/* Recent Sales */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
              <div className="space-y-3">
                {salesReport.items.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{sale.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">{sale.customerName} • {formatDate(sale.invoiceDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(sale.grandTotal)}</p>
                      <p className="text-sm text-green-600">+{formatCurrency(sale.totalProfit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Profit Report */}
        {selectedReport === "profit" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg">
              <p className="text-sm text-blue-100">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(profitReport.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg">
              <p className="text-sm text-green-100">Gross Profit</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(profitReport.grossProfit)}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-lg">
              <p className="text-sm text-orange-100">Total Expenses</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(profitReport.totalExpenses)}</p>
            </div>
            <div className={`rounded-xl p-6 text-white shadow-lg ${profitReport.netProfit >= 0 ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-pink-600"}`}>
              <p className="text-sm opacity-80">Net Profit</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(profitReport.netProfit)}</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</p>
              <p className={`mt-2 text-3xl font-bold ${profitReport.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                {profitReport.profitMargin}%
              </p>
            </div>
          </div>
        )}

        {/* Inventory Report */}
        {selectedReport === "inventory" && (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{inventoryReport.totalItems}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-5 shadow-sm dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">Available</p>
              <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{inventoryReport.available}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-5 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600 dark:text-blue-400">Sold</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{inventoryReport.sold}</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-5 shadow-sm dark:bg-orange-900/20">
              <p className="text-sm text-orange-600 dark:text-orange-400">In Service</p>
              <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">{inventoryReport.inService}</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-5 shadow-sm dark:bg-purple-900/20">
              <p className="text-sm text-purple-600 dark:text-purple-400">Stock Value</p>
              <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(inventoryReport.stockValue)}</p>
            </div>
          </div>
        )}

        {/* Service Report */}
        {selectedReport === "service" && (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Services</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{serviceReport.totalServices}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-5 shadow-sm dark:bg-green-900/20">
              <p className="text-sm text-green-600">Completed</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{serviceReport.completed}</p>
            </div>
            <div className="rounded-xl bg-yellow-50 p-5 shadow-sm dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-700">{serviceReport.pending}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-5 shadow-sm dark:bg-blue-900/20">
              <p className="text-sm text-blue-600">Revenue</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(serviceReport.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-5 shadow-sm dark:bg-red-900/20">
              <p className="text-sm text-red-600">Due</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(serviceReport.totalDue)}</p>
            </div>
          </div>
        )}

        {/* Expense Report */}
        {selectedReport === "expense" && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
                <p className="text-sm text-orange-100">Total Expenses</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(expenseReport.totalAmount)}</p>
                <p className="mt-1 text-sm text-orange-100">{expenseReport.totalExpenses} records</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Expense</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(expenseReport.avgExpense)}</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Categories</h3>
                <div className="mt-3 space-y-2">
                  {expenseReport.topCategories.map(({ category, total }) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{category}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
