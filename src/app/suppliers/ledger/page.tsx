"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSupplierStore, Supplier, SupplierTransaction } from "@/stores/supplierStore";
import { usePurchaseStore } from "@/stores/purchaseStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";

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
      setAmount(Math.max(0, supplier.balance));
      setReference("");
    }
  }, [isOpen, supplier]);

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4 text-left">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paying to</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.name}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
            <span className={`font-bold ${supplier.balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(supplier.balance))}
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

function getTransactionBadge(type: SupplierTransaction["type"]) {
  switch (type) {
    case "purchase":
      return { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Purchase" };
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

  const { getSupplierById, getTransactionsBySupplier, recordPayment } = useSupplierStore();
  const { getPurchasesBySupplier } = usePurchaseStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const supplier = useMemo(() => {
    if (!supplierId) return null;
    return getSupplierById(supplierId);
  }, [supplierId, getSupplierById]);

  const transactions = useMemo(() => {
    if (!supplierId) return [];
    return getTransactionsBySupplier(supplierId);
  }, [supplierId, getTransactionsBySupplier]);

  const purchases = useMemo(() => {
    if (!supplierId) return [];
    return getPurchasesBySupplier(supplierId);
  }, [supplierId, getPurchasesBySupplier]);

  const handlePayment = (amount: number, reference?: string) => {
    if (supplier) {
      recordPayment(supplier.id, amount, reference);
    }
  };

  if (!isLoaded) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {supplier.companyName && `${supplier.companyName} • `}
              {supplier.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/purchases/new?supplier=${supplier.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Purchase
          </Link>
          {supplier.balance > 0 && (
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
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(supplier.totalPurchases)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(supplier.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
          <p className={`text-2xl font-bold ${supplier.balance > 0 ? "text-red-600 dark:text-red-400" : supplier.balance < 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
            {formatCurrency(Math.abs(supplier.balance))}
            <span className="ml-2 text-sm font-normal">
              {supplier.balance > 0 ? "(Payable)" : supplier.balance < 0 ? "(Advance)" : ""}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{purchases.length}</p>
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
                  const isDebit = txn.amount > 0; // Purchases increase what we owe (debit)
                  const isCredit = txn.amount < 0; // Payments decrease what we owe (credit)
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
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(txn.amount)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {isCredit ? (
                          <span className="text-green-600 dark:text-green-400">{formatCurrency(Math.abs(txn.amount))}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(txn.balanceAfter)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Purchases */}
      {purchases.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Order #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Items</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Paid</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Due</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatDate(purchase.purchaseDate)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {purchase.items.length}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400">
                      {formatCurrency(purchase.paidAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                      {formatCurrency(purchase.dueAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          purchase.status === "paid"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : purchase.status === "partial"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {purchase.status === "paid" ? "Paid" : purchase.status === "partial" ? "Partial" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplier={supplier}
        onPay={handlePayment}
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
