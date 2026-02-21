"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/useCustomers";
import { usePurchases } from "@/hooks/usePurchases";
import { Pagination } from "@/components/ui/pagination";
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
  purchasePrice: number;
  paidAmount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  [key: string]: any;
}

function PurchaseHistoryPageContent() {
  const { data: customersData } = useCustomers();
  const customers = customersData?.customers || [];
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };
  const { data: purchasesData, isLoading } = usePurchases({ page, limit: 20 });
  const purchases: PurchaseInvoice[] = ((purchasesData as any)?.purchases || []) as any[];
  const pagination = (purchasesData as any)?.pagination;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<string>("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<"All" | "Paid" | "Partial" | "Unpaid">("All");
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);

  // Get seller name by ID
  const getSellerName = (sellerId: string): string => {
    const seller = customers.find((c) => c.id === sellerId);
    return seller?.name || "Unknown Seller";
  };

  // Product name is already embedded in purchase data

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    let result = purchases;

    // Filter by seller
    if (selectedSeller !== "All") {
      result = result.filter((p) => p.sellerId === selectedSeller);
    }

    // Filter by payment status
    if (selectedPaymentStatus !== "All") {
      result = result.filter((p) => {
        const balance = p.purchasePrice - p.paidAmount;
        if (selectedPaymentStatus === "Paid") return balance === 0;
        if (selectedPaymentStatus === "Partial") return balance > 0 && p.paidAmount > 0;
        if (selectedPaymentStatus === "Unpaid") return p.paidAmount === 0;
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(query) ||
          p.serialNumber.toLowerCase().includes(query) ||
          p.sellerName.toLowerCase().includes(query) ||
          p.productName.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchases, selectedSeller, selectedPaymentStatus, searchQuery]);

  // Stats from API (all data, not just current page)
  const apiStats = (purchasesData as any)?.stats;
  const stats = {
    totalPurchases: apiStats?.totalPurchases || purchases.length,
    totalAmount: apiStats?.totalAmount || purchases.reduce((sum, p) => sum + parseFloat(String(p.purchasePrice || 0)), 0),
    totalPaid: apiStats?.totalPaid || purchases.reduce((sum, p) => sum + parseFloat(String(p.paidAmount || 0)), 0),
    totalDue: apiStats?.totalDue || 0,
  };

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
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Total Purchases</p>
              <p className="mt-1 text-3xl font-bold">{stats.totalPurchases}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Total Amount</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Total Paid</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-100">Total Due</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.totalDue)}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Payment Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["All", "Paid", "Partial", "Unpaid"] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setSelectedPaymentStatus(status); setPage(1); }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedPaymentStatus === status
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-1 gap-4">
          {/* Seller Filter */}
          <select
            value={selectedSeller}
            onChange={(e) => { setSelectedSeller(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="All">All Sellers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by invoice, serial, seller, or product..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Purchase Table */}
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No purchases found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const balance = purchase.purchasePrice - purchase.paidAmount;
                  const isPaid = balance === 0;
                  const isPartial = balance > 0 && purchase.paidAmount > 0;

                  return (
                    <tr
                      key={purchase.id}
                      onClick={() => setViewingInvoice(purchase)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono font-medium text-purple-600 dark:text-purple-400">{purchase.invoiceNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white">{formatDate(purchase.purchaseDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{purchase.sellerName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{purchase.sellerPhone}</p>
                      </td>
                      <td className="hidden px-6 py-4 md:table-cell">
                        <p className="text-gray-900 dark:text-white">{purchase.productName}</p>
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell">
                        <p className="font-mono text-sm text-gray-600 dark:text-gray-400">{purchase.serialNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(purchase.purchasePrice)}</p>
                        {!isPaid && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Paid: {formatCurrency(purchase.paidAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            isPaid
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : isPartial
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid"}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewingInvoice(purchase)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
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

      {/* Pagination placeholder */}
      {filteredPurchases.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>
            Showing {filteredPurchases.length} of {pagination?.total || purchases.length} purchases
          </p>
        </div>
      )}

      {/* Invoice View Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Invoice</h2>
              <button
                onClick={() => setViewingInvoice(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <p className="text-sm text-purple-700 dark:text-purple-300">Invoice Number</p>
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{viewingInvoice.invoiceNumber}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Seller</p>
                  <p className="font-medium text-gray-900 dark:text-white">{viewingInvoice.sellerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{viewingInvoice.sellerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(viewingInvoice.purchaseDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Product</p>
                <p className="font-medium text-gray-900 dark:text-white">{viewingInvoice.productName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Serial: {viewingInvoice.serialNumber}</p>
                {viewingInvoice.imei && <p className="text-sm text-gray-600 dark:text-gray-400">IMEI: {viewingInvoice.imei}</p>}
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Purchase Price:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(viewingInvoice.purchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(viewingInvoice.paidAmount)}</span>
                </div>
                {viewingInvoice.purchasePrice - viewingInvoice.paidAmount > 0 && (
                  <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">Balance Due:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(viewingInvoice.purchasePrice - viewingInvoice.paidAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                <p className="font-medium text-gray-900 dark:text-white">{viewingInvoice.paymentMethod}</p>
              </div>

              {viewingInvoice.notes && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="text-gray-900 dark:text-white">{viewingInvoice.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default function PurchaseHistoryPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div></div>}>
      <PurchaseHistoryPageContent />
    </Suspense>
  );
}
