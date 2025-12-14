"use client";

import { useState, useMemo, useEffect } from "react";
import { useSalesStore, Sale } from "@/stores/salesStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { PrintInvoiceButton } from "@/components/invoice/invoice-print";
import Link from "next/link";

export default function SalesPage() {
  const { sales, getRecentSales, getSalesWithDue } = useSalesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial" | "pending">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Filter sales
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter((s) => {
        const saleDate = new Date(s.invoiceDate);
        if (dateFilter === "today") {
          return saleDate >= today;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return saleDate >= weekAgo;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return saleDate >= monthAgo;
        }
        return true;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(query) ||
          s.customerName.toLowerCase().includes(query) ||
          s.customerPhone.includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [sales, statusFilter, dateFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.grandTotal, 0),
    totalProfit: sales.reduce((sum, s) => sum + s.totalProfit, 0),
    totalDue: sales.reduce((sum, s) => sum + s.dueAmount, 0),
    dueCount: sales.filter((s) => s.dueAmount > 0).length,
  }), [sales]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales History</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all invoices</p>
        </div>
        <Link
          href="/sales/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-500">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Profit</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalProfit)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Due</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalDue)}</p>
          <p className="text-sm text-gray-500">{stats.dueCount} pending</p>
        </div>
        <Link
          href="/sales/due"
          className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white shadow-sm transition-transform hover:scale-[1.02]"
        >
          <p className="text-sm text-orange-100">Collect Due</p>
          <p className="mt-1 text-2xl font-bold">{stats.dueCount} Invoices</p>
          <p className="text-sm text-orange-100">Click to manage →</p>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "completed", "partial", "pending"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                statusFilter === status
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice, customer..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Invoice</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                <th className="hidden px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Paid</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Due</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {sales.length === 0 ? "No sales yet. Create your first invoice!" : "No sales match your filters."}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <p className="font-mono font-medium text-blue-600 dark:text-blue-400">{sale.invoiceNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{sale.customerName}</p>
                      <p className="text-sm text-gray-500">{sale.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 dark:text-gray-400">{formatDate(sale.invoiceDate)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(sale.grandTotal)}</p>
                    </td>
                    <td className="hidden px-6 py-4 text-right md:table-cell">
                      <p className="text-green-600 dark:text-green-400">{formatCurrency(sale.paidAmount)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={sale.dueAmount > 0 ? "font-medium text-red-600 dark:text-red-400" : "text-gray-400"}>
                        {sale.dueAmount > 0 ? formatCurrency(sale.dueAmount) : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <PrintInvoiceButton sale={sale} variant="icon" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      {filteredSales.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredSales.length} of {sales.length} invoices
        </p>
      )}
    </div>
  );
}
