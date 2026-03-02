"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateExpense } from "@/hooks/useExpenses";
import Link from "next/link";

type ExpenseCategory = "Rent" | "Utilities" | "Salary" | "Transport" | "Food" | "Repairs" | "Marketing" | "Supplies" | "Miscellaneous";
type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";

const CATEGORIES: ExpenseCategory[] = ["Rent", "Utilities", "Salary", "Transport", "Food", "Repairs", "Marketing", "Supplies", "Miscellaneous"];

export default function NewExpensePage() {
  const router = useRouter();
  const createExpenseMutation = useCreateExpense();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Miscellaneous" as ExpenseCategory,
    description: "",
    paymentMethod: "Cash" as PaymentMethod,
    amount: 0,
    paidBy: "Admin",
    receipt: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});


  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (formData.amount <= 0) newErrors.amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createExpenseMutation.mutate({
      date: formData.date,
      category: formData.category,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
      amount: formData.amount,
      paidBy: formData.paidBy,
      receipt: formData.receipt || undefined,
      notes: formData.notes || undefined,
    } as any, {
      onSuccess: () => router.push("/expenses"),
    });
  };

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
        <p className="text-gray-600 dark:text-gray-400">Record a new business expense</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Receipt/Reference */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt/Reference</label>
              <input
                type="text"
                value={formData.receipt}
                onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Receipt number or reference"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
                errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
              placeholder="What was this expense for?"
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Amount */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className={`w-full rounded-lg border py-3 pl-10 pr-4 text-xl font-semibold dark:bg-gray-800 dark:text-white ${
                  errors.amount ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
                placeholder="0"
                min="0"
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
            
            {/* Quick amounts */}
            <div className="mt-2 flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: amt })}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  ৳{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Payment Method */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bkash">Bkash</option>
                <option value="Nagad">Nagad</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Paid By */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Paid By</label>
              <input
                type="text"
                value={formData.paidBy}
                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Who paid?"
              />
            </div>
          </div>

       

          {/* Notes */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Link href="/expenses" className="rounded-lg border border-gray-300 px-6 py-3 text-center text-gray-700 dark:border-gray-700 dark:text-gray-300">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-8 py-3 font-medium text-white shadow-lg disabled:opacity-60"
            >
              {createExpenseMutation.isPending ? "Saving..." : "Add Expense"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
