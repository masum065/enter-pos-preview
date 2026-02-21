"use client";

import { useState, useMemo, useEffect } from "react";
import { useSales } from "@/hooks/useSales";
import { useServices } from "@/hooks/useServices";
import { useExpenses } from "@/hooks/useExpenses";
import { useStockItems } from "@/hooks/useStock";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";

type ReportType = "sales" | "profit" | "inventory" | "service" | "expense" | "activity";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");

  const { data: salesData } = useSales();
  const { data: servicesData } = useServices();
  const { data: expensesData } = useExpenses();
  const { data: stockData } = useStockItems();
  const { data: customersData } = useCustomers();

  const salesList = (salesData as any)?.sales || [];
  const servicesList = (servicesData as any)?.services || [];
  const expensesList = (expensesData as any)?.expenses || [];
  const stockItemsList = (stockData as any)?.stockItems || [];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Date filtering helper
  const filterByDate = (
    items: any[],
    dateField: string
  ): any[] => {
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
    const filtered = filterByDate(salesList, "invoiceDate");
    return {
      totalSales: filtered.length,
      totalRevenue: filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.grandTotal) || 0), 0),
      totalProfit: filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.totalProfit) || 0), 0),
      totalDue: filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.dueAmount) || 0), 0),
      avgOrderValue: filtered.length > 0 ? Math.round(filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.grandTotal) || 0), 0) / filtered.length) : 0,
      items: filtered.slice(0, 10),
    };
  }, [salesList, dateRange]);

  // Inventory Report Data
  const inventoryReport = useMemo(() => {
    // stockItemsList is StockItemWithProduct[] -> flatten
    const flatStock = stockItemsList.map((s: any) => s.stockItem || s);
    const available = flatStock.filter((s: any) => s.status === "Available");
    const sold = flatStock.filter((s: any) => s.status === "Sold");
    const service = flatStock.filter((s: any) => s.status === "Service");
    return {
      totalItems: flatStock.length,
      available: available.length,
      sold: sold.length,
      inService: service.length,
      stockValue: available.reduce((sum: number, s: any) => sum + (parseFloat(s.purchasePrice) || 0), 0),
    };
  }, [stockItemsList]);

  // Service Report Data
  const serviceReport = useMemo(() => {
    const filtered = filterByDate(servicesList, "createdAt");
    const completed = filtered.filter((s: any) => s.status === "Completed" || s.status === "Delivered");
    return {
      totalServices: filtered.length,
      completed: completed.length,
      pending: filtered.length - completed.length,
      totalRevenue: filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.totalCost) || 0), 0),
      totalDue: filtered.reduce((sum: number, s: any) => sum + (parseFloat(s.dueAmount) || 0), 0),
    };
  }, [servicesList, dateRange]);

  // Expense Report Data
  const expenseReport = useMemo(() => {
    const filtered = filterByDate(expensesList, "date");
    // Build category breakdown from expenses
    const categoryMap: Record<string, number> = {};
    filtered.forEach((e: any) => {
      const cat = e.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (parseFloat(e.amount) || 0);
    });
    const byCategory = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
    return {
      totalExpenses: filtered.length,
      totalAmount: filtered.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0),
      avgExpense: filtered.length > 0 ? Math.round(filtered.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0) / filtered.length) : 0,
      topCategories: byCategory.slice(0, 5),
    };
  }, [expensesList, dateRange]);

  // Profit Report Data
  const profitReport = useMemo(() => {
    const salesFiltered = filterByDate(salesList, "invoiceDate");
    const expenseFiltered = filterByDate(expensesList, "date");
    
    const totalRevenue = salesFiltered.reduce((sum: number, s: any) => sum + (parseFloat(s.grandTotal) || 0), 0);
    const totalProfit = salesFiltered.reduce((sum: number, s: any) => sum + (parseFloat(s.totalProfit) || 0), 0);
    const totalExpenses = expenseFiltered.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const netProfit = totalProfit - totalExpenses;
    
    return {
      totalRevenue,
      grossProfit: totalProfit,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
    };
  }, [salesList, expensesList, dateRange]);

  // Export handlers
  const handleExport = () => {
    if (selectedReport === "sales") {
      const data = salesList.map((s: any) => ({
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
      const data = expensesList.map((e: any) => ({
        Number: e.expenseNumber,
        Date: formatDate(e.date),
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Method: e.paymentMethod,
        PaidBy: e.paidBy,
      }));
      downloadCSV(data, `expense-report-${new Date().toISOString().split("T")[0]}`);
    } else if (selectedReport === "activity") {
      // Activity logs not yet available from API
    }
  };

  const handleClearLogs = () => {
    // Not needed in API mode
  };

  const filteredLogs: any[] = [];


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
        {(["sales", "profit", "inventory", "service", "expense", "activity"] as ReportType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedReport(type)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
              selectedReport === type
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {type === "activity" ? "Activity Log" : `${type} Report`}
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

        {/* Activity Log Report */}
        {selectedReport === "activity" && (
          <div className="space-y-4">
            {/* Log Controls */}
            <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search logs by user, action or details..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">All Actions</option>
                <option value="LOGIN">Logins</option>
                <option value="SALE_CREATE">Sales</option>
                <option value="REFUND">Refunds</option>
                <option value="STOCK_UPDATE">Stock Updates</option>
                <option value="PRICE_CHANGE">Price Changes</option>
              </select>j
              <button
              disabled={true}
                onClick={handleClearLogs}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
              >
                Clear Data
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Detailed System Audit Trail</h3>
                <span className="text-xs font-medium text-gray-500">{filteredLogs.length} logs found</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredLogs.length > 0 ? (
                  filteredLogs.slice(0, 50).map((log) => (
                    <div key={log.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                      <div 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                      >
                        <div className={`mt-1 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          log.action === "LOGIN" ? "bg-green-100 text-green-600" :
                          log.action === "SALE_CREATE" ? "bg-blue-100 text-blue-600" :
                          log.action === "PRICE_CHANGE" ? "bg-orange-100 text-orange-600" :
                          log.action === "REFUND" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                        }`}>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {log.action === "LOGIN" && <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />}
                            {log.action === "SALE_CREATE" && <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                            {log.action === "STOCK_UPDATE" && <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
                            {log.action === "PRICE_CHANGE" && <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />}
                            {log.action === "REFUND" && <path d="M16 15L12 19M12 19L8 15M12 19V9.5C12 7.56701 13.567 6 15.5 6H16" />}
                            {!["LOGIN", "SALE_CREATE", "STOCK_UPDATE", "PRICE_CHANGE", "REFUND"].includes(log.action) && <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-900 dark:text-white capitalize">{log.action.replace('_', ' ').toLowerCase()}</span>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {formatDate(log.timestamp, "datetime")}
                              </span>
                            </div>
                            <div className={`transition-transform duration-200 ${expandedLogId === log.id ? 'rotate-180' : ''}`}>
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">{log.details}</p>
                          <div className="mt-2 flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                </svg>
                              </div>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                <span className="text-gray-400">By:</span> {log.userName}
                                {log.userRole && (
                                  <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                                    log.userRole === "admin" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                    log.userRole === "manager" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                  }`}>
                                    {log.userRole}
                                  </span>
                                )}
                              </span>
                            </div>
                            {log.ipAddress && (
                              <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-gray-800 pl-4">
                                <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0L9 7" />
                                </svg>
                                <span className="text-[11px] font-mono text-gray-400">
                                  {log.ipAddress === "::1" || log.ipAddress === "127.0.0.1" ? "Localhost" : log.ipAddress}
                                </span>
                              </div>
                            )}
                            {log.entityId && (
                              <span className="text-xs text-gray-400">
                                ID: <span className="font-mono">{log.entityId}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {expandedLogId === log.id && (log.before || log.after) && (
                        <div className="px-6 pb-6 pt-2 bg-gray-50/50 dark:bg-gray-800/20">
                          <div className="ml-11 grid gap-4 md:grid-cols-2">
                            {log.before && (
                              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Original Data</p>
                                  <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-600">Old State</span>
                                </div>
                                <pre className="overflow-auto text-[11px] font-mono text-gray-600 dark:text-gray-400 max-h-60 leading-relaxed">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after && (
                              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Modified Data</p>
                                  <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] text-green-600">New State</span>
                                </div>
                                <pre className="overflow-auto text-[11px] font-mono text-gray-600 dark:text-gray-400 max-h-60 leading-relaxed">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="mt-4">No activity logs match your current filters or searching.</p>
                    <button 
                      onClick={() => { setLogSearch(""); setLogActionFilter("all"); }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
