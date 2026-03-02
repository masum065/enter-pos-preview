"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePurchases } from "@/hooks/usePurchases";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  productId: string;
  productName: string;
  serialNumber: string;
  imei?: string;
  purchasePrice: string;
  paidAmount: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  [key: string]: any;
}

// ── Invoice Detail Modal ─────────────────────────────────────────────────────
function PurchaseDetailModal({
  purchase,
  onClose,
}: {
  purchase: PurchaseInvoice;
  onClose: () => void;
}) {
  const purchasePrice = parseFloat(purchase.purchasePrice);
  const paidAmount = parseFloat(purchase.paidAmount);
  const balance = purchasePrice - paidAmount;
  const isPaid = balance <= 0;
  const isPartial = balance > 0 && paidAmount > 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="Purchase Invoice" size="md">
      <div className="space-y-4 text-left">
        {/* Invoice Number */}
        <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <p className="text-sm text-purple-600 dark:text-purple-400">Invoice Number</p>
          <p className="mt-1 font-mono text-xl font-bold text-purple-900 dark:text-purple-100">
            {purchase.invoiceNumber}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(purchase.purchaseDate)}
          </p>
        </div>

        {/* Seller & Product */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Seller</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchase.sellerName}</p>
            <p className="text-sm text-gray-500">{purchase.sellerPhone}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Product</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchase.productName}</p>
            <p className="font-mono text-sm text-gray-500">S/N: {purchase.serialNumber}</p>
            {purchase.imei && <p className="font-mono text-sm text-gray-500">IMEI: {purchase.imei}</p>}
          </div>
        </div>

        {/* Financial */}
        <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Purchase Price</span>
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(purchasePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Paid to Seller</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(paidAmount)}</span>
          </div>
          {balance > 0 && (
            <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span className="font-medium text-gray-900 dark:text-white">Balance Due to Seller</span>
              <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(balance)}</span>
            </div>
          )}
        </div>

        {/* Status + Payment */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              isPaid
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : isPartial
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid"}
          </span>
          <span className="text-sm text-gray-500">{purchase.paymentMethod}</span>
        </div>

        {purchase.notes && (
          <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Notes</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{purchase.notes}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page Content ────────────────────────────────────────────────────────
function PurchaseHistoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  // ── Local UI state ────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [paymentStatus, setPaymentStatus] = useState<"all" | "paid" | "partial" | "unpaid">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);

  // Compute startDate/endDate from dateFilter for server-side filtering
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

  const { data: purchasesData, isLoading } = usePurchases({
    page,
    limit: 20,
    search: activeSearch || undefined,
    paymentStatus: paymentStatus !== "all" ? paymentStatus : undefined,
    startDate,
    endDate,
  });

  const purchases: PurchaseInvoice[] = (purchasesData?.purchases || []) as any[];
  const pagination = (purchasesData as any)?.pagination;
  const apiStats = (purchasesData as any)?.stats;

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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase History</h1>
          <p className="text-gray-600 dark:text-gray-400">View all local product purchases</p>
        </div>
        <Link
          href="/purchases/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase
        </Link>
      </div>

      {/* Stats Cards — light, like sales page */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{apiStats?.totalPurchases ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">{formatCurrency(apiStats?.totalAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(apiStats?.totalPaid ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Due to Sellers</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(apiStats?.totalDue ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Showing</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{purchases.length}</p>
          <p className="mt-1 text-sm text-gray-500">of {pagination?.total ?? 0} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Payment Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "paid", "partial", "unpaid"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setPaymentStatus(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                paymentStatus === status
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

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

        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search invoice, serial, seller, product..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
              className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Invoice #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Seller</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Product</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">Serial #</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {activeSearch
                      ? `No purchases found for "${activeSearch}"`
                      : "No purchases yet. Create your first purchase!"}
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const purchasePrice = parseFloat(purchase.purchasePrice);
                  const paidAmount = parseFloat(purchase.paidAmount);
                  const balance = purchasePrice - paidAmount;
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && paidAmount > 0;

                  return (
                    <tr
                      key={purchase.id}
                      onClick={() => setViewingInvoice(purchase)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono font-medium text-purple-600 dark:text-purple-400">
                          {purchase.invoiceNumber}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(purchase.purchaseDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{purchase.sellerName}</p>
                        <p className="text-sm text-gray-500">{purchase.sellerPhone}</p>
                      </td>
                      <td className="hidden px-6 py-4 md:table-cell">
                        <p className="text-gray-900 dark:text-white">{purchase.productName}</p>
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell">
                        <p className="font-mono text-sm text-gray-600 dark:text-gray-400">{purchase.serialNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(purchasePrice)}</p>
                        {!isPaid && (
                          <p className="text-sm text-gray-500">Paid: {formatCurrency(paidAmount)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isPaid
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : isPartial
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewingInvoice(purchase)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
                          title="View Invoice"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* Invoice Detail Modal */}
      {viewingInvoice && (
        <PurchaseDetailModal
          purchase={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
}

export default function PurchaseHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <PurchaseHistoryPageContent />
    </Suspense>
  );
}
