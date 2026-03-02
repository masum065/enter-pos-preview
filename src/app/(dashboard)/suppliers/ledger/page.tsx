"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSupplier } from "@/hooks/useSuppliers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Supplier {
  id: string;
  companyName: string;
  phone: string;
  balance: string;
  totalPurchases: string;
  totalPaid: string;
  [key: string]: any;
}

interface SupplierTransaction {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  reference: string | null;
  balanceAfter: string;
  createdAt: string;
  [key: string]: any;
}

// Payment Modal
function PaymentModal({
  isOpen,
  onClose,
  supplier,
  onPay,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onPay: (amount: number, reference?: string) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (isOpen && supplier) {
      setAmount(Math.max(0, parseFloat(supplier.balance)));
      setReference("");
    }
  }, [isOpen, supplier]);

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4 text-left">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paying to</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.companyName || 'Unnamed Supplier'}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
            <span className={`font-bold ${parseFloat(supplier.balance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(parseFloat(supplier.balance)))}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            min={0}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference (Optional)
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Transaction ID, Check No., etc."
          />
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={() => {
          if (amount > 0) {
            onPay(amount, reference || undefined);
            onClose();
          }
        }}
        cancelText="Cancel"
        confirmText="Record Payment"
        confirmVariant="primary"
      />
    </Modal>
  );
}

// Adjustment Modal — set opening due or advance balance
function AdjustmentModal({ isOpen, onClose, supplier, onAdjust }: {
  isOpen: boolean; onClose: () => void; supplier: Supplier | null;
  onAdjust: (type: "due" | "advance", amount: number, description?: string, reference?: string) => void;
}) {
  const [adjType, setAdjType] = useState<"due" | "advance">("due");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (isOpen) { setAmount(""); setDescription(""); setReference(""); setAdjType("due"); }
  }, [isOpen]);

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Balance Adjustment" size="sm">
      <div className="space-y-4 text-left">
        <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            Use this to set an <strong>opening/existing balance</strong>. Due = we owe them. Advance = they owe us.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAdjType("due")}
            className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${adjType === "due" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"}`}>
            📤 Due (We Owe)
          </button>
          <button type="button" onClick={() => setAdjType("advance")}
            className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${adjType === "advance" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"}`}>
            📥 Advance (They Owe)
          </button>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">৳</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="0" min="0" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder={adjType === "due" ? "e.g. Opening due balance" : "e.g. Advance given"} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Reference (optional)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Invoice #, note..." />
        </div>
      </div>
      <ModalFooter onCancel={onClose}
        onConfirm={() => {
          const amt = parseFloat(amount);
          if (!amt || amt <= 0) return;
          onAdjust(adjType, amt, description || undefined, reference || undefined);
          onClose();
        }}
        cancelText="Cancel" confirmText={`Add ${adjType === "due" ? "Due" : "Advance"}`} confirmVariant="primary" />
    </Modal>
  );
}

function getTransactionBadge(type: string) {
  switch (type) {
    case "stock_add":
      return { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Stock Add" };
    case "payment":
      return { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Payment" };
    case "return":
      return { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Return" };
    case "adjustment":
      return { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Adjustment" };
    default:
      return { color: "bg-gray-100 text-gray-700", label: type };
  }
}

function SupplierLedgerContent() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("id");

  const { data: supplierData, isLoading } = useSupplier(supplierId || "");
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Fetch supplier transactions
  useEffect(() => {
    if (supplierId) {
      apiClient.get<SupplierTransaction[]>(`/api/suppliers/${supplierId}/payments`)
        .then((data: any) => setTransactions(Array.isArray(data) ? data : data.transactions || []))
        .catch(() => setTransactions([]));
    }
  }, [supplierId]);

  const supplier = supplierData as Supplier | null;

  const handlePayment = async (amount: number, reference?: string) => {
    if (supplier) {
      await apiClient.post(`/api/suppliers/${supplier.id}/payments`, { amount, reference });
      // Refresh transactions
      const data = await apiClient.get<any>(`/api/suppliers/${supplier.id}/payments`);
      setTransactions(Array.isArray(data) ? data : data.transactions || []);
    }
  };
  const handleAdjustment = async (
    type: "due" | "advance",
    amount: number,
    description?: string,
    reference?: string,
  ) => {
    if (supplier) {
      await apiClient.post(`/api/suppliers/${supplier.id}/adjustments`, { type, amount, description, reference });
      const data = await apiClient.get<any>(`/api/suppliers/${supplier.id}/payments`);
      setTransactions(Array.isArray(data) ? data : data.transactions || []);
      // Refresh supplier balance
      const fresh = await apiClient.get<any>(`/api/suppliers/${supplier.id}`);
      // useSupplier will re-fetch via query client, but we also refresh local transactions
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-xl text-gray-500">Supplier not found</p>
        <Link href="/suppliers" className="text-blue-600 hover:underline">
          Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/suppliers"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.companyName || 'Unnamed Supplier'}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {supplier.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Adjust Balance — always available */}
          <button
            onClick={() => setShowAdjustModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 font-medium text-white shadow-lg hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adjust Balance
          </button>
          {parseFloat(supplier.balance) > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 font-medium text-white shadow-lg hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Make Payment
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(parseFloat(supplier.totalPurchases))}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(parseFloat(supplier.totalPaid))}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
          <p className={`text-2xl font-bold ${parseFloat(supplier.balance) > 0 ? "text-red-600 dark:text-red-400" : parseFloat(supplier.balance) < 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
            {formatCurrency(Math.abs(parseFloat(supplier.balance)))}
            <span className="ml-2 text-sm font-normal">
              {parseFloat(supplier.balance) > 0 ? "(Payable)" : parseFloat(supplier.balance) < 0 ? "(Advance)" : ""}
            </span>
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History (Ledger)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Debit</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Credit</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No transactions yet
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const badge = getTransactionBadge(txn.type);
                  const isDebit = parseFloat(txn.amount) > 0;
                  const isCredit = parseFloat(txn.amount) < 0;
                  return (
                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(txn.createdAt, "datetime")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">{txn.description}</p>
                        {txn.reference && (
                          <p className="text-xs text-gray-500">Ref: {txn.reference}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {isDebit ? (
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(parseFloat(txn.amount))}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {isCredit ? (
                          <span className="text-green-600 dark:text-green-400">{formatCurrency(Math.abs(parseFloat(txn.amount)))}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(parseFloat(txn.balanceAfter))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplier={supplier}
        onPay={handlePayment}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        supplier={supplier}
        onAdjust={handleAdjustment}
      />
    </div>
  );
}

export default function SupplierLedgerPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    }>
      <SupplierLedgerContent />
    </Suspense>
  );
}
