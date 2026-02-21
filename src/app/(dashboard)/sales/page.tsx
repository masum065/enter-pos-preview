"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSales } from "@/hooks/useSales";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { PrintInvoiceButton, InvoicePrintModal } from "@/components/invoice/invoice-print";
import { Modal } from "@/components/ui/modal";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface SaleItem {
  id: string;
  productName: string;
  serialNumber: string;
  amount: number;
  stockItemId: string;
  isReturned?: boolean;
  [key: string]: any;
}

interface SalePayment {
  method: string;
  amount: number;
  paidAt: string;
  [key: string]: any;
}

interface SaleReturn {
  createdAt: string;
  refundAmount: number;
  reason: string;
  returnedItems: any[];
  [key: string]: any;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  payments: SalePayment[];
  returns?: SaleReturn[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  totalProfit: number;
  totalReturned?: number;
  status: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  [key: string]: any;
}

type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";

// Return Modal Component
function ReturnModal({
  sale,
  onClose,
  onSuccess,
}: {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("Cash");
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const availableItems = sale.items.filter((item) => !item.isReturned);

  const selectedTotal = useMemo(() => {
    return availableItems
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [availableItems, selectedItems]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === availableItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(availableItems.map((item) => item.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return;
    if (!reason.trim()) {
      alert("Please provide a reason for the return");
      return;
    }

    setIsProcessing(true);

    try {
      // Process the return via API
      await apiClient.post(`/api/sales/${sale.id}/returns`, {
        itemIds: selectedItems,
        refundMethod,
        refundAmount: selectedTotal,
        reason,
        processedBy: "Admin",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Return failed:", error);
      alert("Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Process Return" size="lg">
      <div className="space-y-6 text-left">
        {/* Invoice Info */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Invoice</span>
            <span className="font-mono font-semibold text-blue-600">{sale.invoiceNumber}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Customer</span>
            <span className="font-medium text-gray-900 dark:text-white">{sale.customerName}</span>
          </div>
        </div>

        {/* Available Items */}
        {availableItems.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">All items have already been returned</p>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">Select Items to Return</h4>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {selectedItems.length === availableItems.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {availableItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      selectedItems.includes(item.id)
                        ? "border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="text-sm text-gray-500">Serial: {item.serialNumber}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Return Details */}
            {selectedItems.length > 0 && (
              <>
                {/* Reason */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason for Return <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Defective product, Customer changed mind..."
                  />
                </div>

                {/* Refund Method */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bkash">Bkash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium text-red-700 dark:text-red-300">
                      Total Refund ({selectedItems.length} items)
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(selectedTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-600 dark:text-gray-300"
          >
            Cancel
          </button>
          {selectedItems.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !reason.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Process Return
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Sale Detail Modal Component
function SaleDetailModal({
  sale,
  onClose,
  onPrint,
  onReturn,
}: {
  sale: Sale;
  onClose: () => void;
  onPrint: () => void;
  onReturn: () => void;
}) {
  const hasReturnableItems = sale.items.some((item) => !item.isReturned);
  const hasReturns = sale.returns && sale.returns.length > 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="Invoice Details" size="lg">
      <div className="space-y-6 text-left">
        {/* Invoice Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Number</p>
            <p className="mt-1 font-mono text-xl font-bold text-blue-600 dark:text-blue-400">
              {sale.invoiceNumber}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(sale.invoiceDate)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{sale.customerName}</p>
          <p className="text-gray-600 dark:text-gray-400">{sale.customerPhone}</p>
        </div>

        {/* Items */}
        <div>
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
            Items ({sale.items.length})
          </h4>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Serial</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${item.isReturned ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{item.productName}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{item.serialNumber}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.isReturned ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Returned
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Discount</span>
              <span className="font-medium text-red-600">-{formatCurrency(sale.discountAmount)}</span>
            </div>
          )}
          {sale.totalReturned && sale.totalReturned > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Returned</span>
              <span className="font-medium text-red-600">-{formatCurrency(sale.totalReturned)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-blue-200 pt-2 dark:border-blue-800">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Grand Total</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(sale.grandTotal)}</span>
          </div>
        </div>

        {/* Payments */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-white">Payments</h4>
          {sale.payments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No payments recorded</p>
          ) : (
            <div className="space-y-2">
              {sale.payments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-800 dark:text-green-300">
                      {payment.method}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(payment.paidAt)}</span>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Returns History */}
        {hasReturns && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Return History</h4>
            <div className="space-y-2">
              {sale.returns!.map((ret, idx) => (
                <div key={idx} className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{formatDate(ret.createdAt)}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(ret.refundAmount)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {ret.returnedItems.length} item(s) • {ret.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-300">Paid</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(sale.paidAmount)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">Due</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(sale.dueAmount)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
            <p className="text-sm text-purple-700 dark:text-purple-300">Profit</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(sale.totalProfit)}</p>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Notes</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{sale.notes}</p>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Status: </span>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusColor(sale.status)}`}>
              {sale.status.replace("_", " ")}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Created by: {sale.createdBy}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {hasReturnableItems && sale.status !== "returned" && (
            <button
              onClick={onReturn}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Return Items
            </button>
          )}
          {sale.dueAmount > 0 && (
            <Link
              href="/sales/due"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
            >
              Collect Due
            </Link>
          )}
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SalesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };
  const { data: salesData, isLoading } = useSales({ page, limit: 20 });
  const sales: Sale[] = (salesData?.sales || []) as any[];
  const pagination = (salesData as any)?.pagination;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial" | "pending" | "returned">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);

  // Filter sales
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "returned") {
        result = result.filter((s) => s.status === "returned" || s.status === "partially_returned");
      } else {
        result = result.filter((s) => s.status === statusFilter);
      }
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
  // Stats from API (all data, not just current page)
  const apiStats = (salesData as any)?.stats;
  const stats = {
    total: apiStats?.total || sales.length,
    totalAmount: apiStats?.totalAmount || sales.reduce((sum, s) => sum + s.grandTotal, 0),
    totalProfit: apiStats?.totalProfit || sales.reduce((sum, s) => sum + s.totalProfit, 0),
    totalDue: apiStats?.totalDue || sales.reduce((sum, s) => sum + s.dueAmount, 0),
    dueCount: apiStats?.dueCount || sales.filter((s) => s.dueAmount > 0).length,
    returnedCount: sales.filter((s) => s.status === "returned" || s.status === "partially_returned").length,
  };

  const handleViewSale = async (sale: Sale) => {
    try {
      const fullSale = await apiClient.get(`/api/sales/${sale.id}`);
      setViewingSale(fullSale as Sale);
    } catch {
      setViewingSale(sale);
    }
  };

  const handlePrintFromDetail = () => {
    if (viewingSale) {
      setPrintingSale(viewingSale);
      setViewingSale(null);
    }
  };

  const handlePrintSale = async (sale: Sale) => {
    try {
      const fullSale = await apiClient.get(`/api/sales/${sale.id}`);
      setPrintingSale(fullSale as Sale);
    } catch {
      setPrintingSale(sale);
    }
  };

  const handleReturnFromDetail = () => {
    if (viewingSale) {
      setReturningSale(viewingSale);
      setViewingSale(null);
    }
  };

  const handleReturnSuccess = () => {
    setReturningSale(null);
    // Optionally show a toast
  };

  if (isLoading) {
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
          {(["all", "completed", "partial", "pending", "returned"] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
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
          onChange={(e) => { setDateFilter(e.target.value as typeof dateFilter); setPage(1); }}
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
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
                  <tr 
                    key={sale.id} 
                    onClick={() => handleViewSale(sale)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
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
                        {sale.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          onClick={() => handleViewSale(sale)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          title="View Details"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Print Button */}
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
          Showing {filteredSales.length} of {pagination?.total || sales.length} invoices
        </p>
      )}

      {/* Sale Detail Modal */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
          onPrint={handlePrintFromDetail}
          onReturn={handleReturnFromDetail}
        />
      )}

      {/* Print Modal */}
      {printingSale && (
        <InvoicePrintModal
          sale={printingSale}
          isOpen={true}
          onClose={() => setPrintingSale(null)}
        />
      )}

      {/* Return Modal */}
      {returningSale && (
        <ReturnModal
          sale={returningSale}
          onClose={() => setReturningSale(null)}
          onSuccess={handleReturnSuccess}
        />
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

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>}>
      <SalesPageContent />
    </Suspense>
  );
}
