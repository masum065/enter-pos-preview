"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useExpenses } from "@/hooks/useExpenses";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const CATEGORIES = ["Rent", "Utilities", "Salary", "Transport", "Food", "Repairs", "Marketing", "Supplies", "Miscellaneous"];

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  paymentMethod: string;
  paidBy: string;
  receipt?: string;
  notes?: string;
  [key: string]: any;
}

function ExpensesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  // ── Local UI state (no router.push — no reload) ───────────────────────────
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Compute startDate/endDate from dateFilter
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "custom") {
      return { startDate: dateFrom || undefined, endDate: dateTo || undefined };
    }
    return {};
  };

  const { startDate, endDate } = getDateRange();

  const { data: expensesData, isLoading, isFetching } = useExpenses({
    page,
    limit: 20,
    search: activeSearch || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    startDate,
    endDate,
  });

  const expenses: Expense[] = (expensesData?.expenses || []) as any[];
  const pagination = (expensesData as any)?.pagination;
  const apiStats = (expensesData as any)?.stats;
  const apiCategoryBreakdown = (expensesData as any)?.categoryBreakdown || [];

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = searchInput.trim();
    if (query) { params.set("search", query); params.delete("page"); }
    else params.delete("search");
    router.push(`?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search"); params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // True initial load only
  if (isLoading && !expensesData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage business expenses</p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(apiStats?.thisMonthAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(apiStats?.todayAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Showing</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{pagination?.total ?? expenses.length}</p>
          <p className="mt-1 text-sm text-gray-500">records</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Filter Total</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(apiStats?.filteredAmount ?? 0)}</p>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      {apiCategoryBreakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                categoryFilter === "all"
                  ? "border-orange-500 bg-orange-50 font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              All
            </button>
            {apiCategoryBreakdown.map(({ category, total }: { category: string; total: string }) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category === categoryFilter ? "all" : category)}
                className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                  categoryFilter === category
                    ? "border-orange-500 bg-orange-50 font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                }`}
              >
                <span className="font-medium">{category}</span>
                <span className="ml-2 text-gray-400">{formatCurrency(Number(total))}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Date Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "all", "custom"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                dateFilter === filter
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {filter === "all" ? "All Time" : filter === "month" ? "This Month" : filter === "week" ? "This Week" : filter === "custom" ? "Custom" : "Today"}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}

        {/* Server-side Search */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search description, category, paid by..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Expenses Table */}
      <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
        {isFetching && (
          <div className="absolute right-4 top-4 z-10">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Expense #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Method</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {activeSearch
                      ? `No expenses found for "${activeSearch}"`
                      : "No expenses found for this period."}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-orange-600 dark:text-orange-400">{expense.expenseNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                      <p className="text-sm text-gray-500">Paid by: {expense.paidBy}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(expense.date)}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                      {expense.paymentMethod}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(parseFloat(expense.amount))}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <ExpensesPageContent />
    </Suspense>
  );
}
