"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { SupplierFormFields } from "@/components/suppliers/supplier-form";
import Link from "next/link";

export default function NewSupplierPage() {
  const router = useRouter();
  const createSupplierMutation = useCreateSupplier();

  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createSupplierMutation.mutate(
      {
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      } as any,
      {
        onSuccess: () => router.push("/suppliers"),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Supplier</h1>
          <p className="text-gray-600 dark:text-gray-400">Add a new supplier to your directory</p>
        </div>
        <Link
          href="/suppliers"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

          <SupplierFormFields
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isPending={createSupplierMutation.isPending}
          />

          {/* Buttons */}
          <div className="flex gap-4">
            <Link
              href="/suppliers"
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createSupplierMutation.isPending}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
            >
              {createSupplierMutation.isPending ? "Saving..." : "Add Supplier"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
