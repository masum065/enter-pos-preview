"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateExpense } from "@/hooks/useExpenses";
import Link from "next/link";

import { ExpenseFormFields, ExpenseFormData, ExpenseCategory, PaymentMethod } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  const router = useRouter();
  const createExpenseMutation = useCreateExpense();

  const [formData, setFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split("T")[0],
    category: "Miscellaneous",
    description: "",
    paymentMethod: "Cash",
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
        <p className="text-gray-600 dark:text-gray-400">Record a new business expense</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <ExpenseFormFields
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isPending={createExpenseMutation.isPending}
          />

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
