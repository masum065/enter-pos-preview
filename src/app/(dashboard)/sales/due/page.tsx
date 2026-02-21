"use client";

import { useState, useMemo } from "react";
import { useSales } from "@/hooks/useSales";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";

type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";

interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  [key: string]: any;
}

// Payment Modal Component using reusable Modal
function PaymentModal({
  sale,
  onClose,
  onSubmit,
}: {
  sale: Sale;
  onClose: () => void;
  onSubmit: (method: PaymentMethod, amount: number) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [amount, setAmount] = useState(sale.dueAmount);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (amount > sale.dueAmount) {
      setError("Amount cannot exceed due amount");
      return;
    }
    onSubmit(method, amount);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Collect Payment - ${sale.invoiceNumber}`} size="md">
      <div className="space-y-4 text-left">
        {/* Summary */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(sale.grandTotal)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Already Paid</span>
            <span className="text-green-600 dark:text-green-400">{formatCurrency(sale.paidAmount)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
            <span className="font-medium text-gray-900 dark:text-white">Due Amount</span>
            <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(sale.dueAmount)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="Cash">Cash</option>
            <option value="Bkash">Bkash</option>
            <option value="Nagad">Nagad</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={sale.dueAmount}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAmount(sale.dueAmount)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            Full Amount
          </button>
          <button
            type="button"
            onClick={() => setAmount(Math.round(sale.dueAmount / 2))}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            Half
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-6">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2 font-medium text-white"
        >
          Collect {formatCurrency(amount)}
        </button>
      </div>
    </Modal>
  );
}

export default function DueCollectionPage() {
  const { data: salesData, isLoading } = useSales();
  const allSales: Sale[] = (salesData?.sales || []) as any[];
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const salesWithDue = useMemo(() => {
    return allSales.filter(s => parseFloat(String(s.dueAmount || 0)) > 0).sort((a, b) => parseFloat(String(b.dueAmount || 0)) - parseFloat(String(a.dueAmount || 0)));
  }, [allSales]);

  const totalDue = useMemo(() => {
    return salesWithDue.reduce((sum, s) => sum + parseFloat(String(s.dueAmount || 0)), 0);
  }, [salesWithDue]);

  const handlePayment = async (method: PaymentMethod, amount: number) => {
    if (selectedSale) {
      try {
        await apiClient.post(`/api/sales/${selectedSale.id}/payments`, { method, amount });
        setSelectedSale(null);
        // The useSales hook will refetch automatically
      } catch (error) {
        console.error("Payment failed:", error);
      }
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Due Collection</h1>
        <p className="text-gray-600 dark:text-gray-400">Collect pending payments from customers</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white shadow-lg">
          <p className="text-lg font-medium text-red-100">Total Due Amount</p>
          <p className="mt-2 text-4xl font-bold">{formatCurrency(totalDue)}</p>
          <p className="mt-1 text-red-100">{salesWithDue.length} invoices pending</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Quick Stats</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Highest Due</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {salesWithDue[0] ? formatCurrency(salesWithDue[0].dueAmount) : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Average Due</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {salesWithDue.length > 0 ? formatCurrency(Math.round(totalDue / salesWithDue.length)) : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Due List */}
      <div className="space-y-4">
        {salesWithDue.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <div className="text-4xl">🎉</div>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No pending dues!</p>
            <p className="text-gray-500 dark:text-gray-400">All invoices are fully paid.</p>
          </div>
        ) : (
          salesWithDue.map((sale) => (
            <div
              key={sale.id}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-blue-600 dark:text-blue-400">{sale.invoiceNumber}</span>
                  <span className="text-sm text-gray-500">{formatDate(sale.invoiceDate)}</span>
                </div>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{sale.customerName}</p>
                <p className="text-sm text-gray-500">{sale.customerPhone}</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total: {formatCurrency(sale.grandTotal)}</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    Due: {formatCurrency(sale.dueAmount)}
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedSale(sale)}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
                >
                  Collect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {selectedSale && (
        <PaymentModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onSubmit={handlePayment}
        />
      )}
    </div>
  );
}
