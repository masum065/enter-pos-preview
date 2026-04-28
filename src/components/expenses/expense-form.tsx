"use client";

import React from "react";

export type ExpenseCategory = "Rent" | "Utilities" | "Salary" | "Transport" | "Food" | "Repairs" | "Marketing" | "Supplies" | "Miscellaneous";
export type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["Rent", "Utilities", "Salary", "Transport", "Food", "Repairs", "Marketing", "Supplies", "Miscellaneous"];

export interface ExpenseFormData {
  date: string;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paidBy: string;
  receipt: string;
  notes: string;
}

export function ExpenseFormFields({
  formData,
  setFormData,
  errors,
  isPending = false,
}: {
  formData: ExpenseFormData;
  setFormData: (data: ExpenseFormData) => void;
  errors: Record<string, string>;
  isPending?: boolean;
}) {
  const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="space-y-4 text-left">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            disabled={isPending}
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
            disabled={isPending}
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
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isPending}
          className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
            errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-700"
          }`}
          placeholder="What was this expense for?"
        />
        {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
          <input
            type="number"
            value={formData.amount || ""}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            disabled={isPending}
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
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              ৳{amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Method */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
            disabled={isPending}
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
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Who paid?"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={isPending}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Additional notes..."
        />
      </div>
    </div>
  );
}
