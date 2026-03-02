"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import Link from "next/link";

export default function NewSupplierPage() {
  const router = useRouter();
  const createSupplierMutation = useCreateSupplier();

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
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
        contactPerson: formData.contactPerson.trim() || undefined,
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

          {/* Company Name */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company / Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
                errors.companyName ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
              placeholder="e.g. Samsung Electronics BD"
              autoFocus
            />
            {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
          </div>

          {/* Contact Person */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contact Person <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Contact person name"
            />
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-2">
            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
                  errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
                placeholder="01XXXXXXXXX"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email <span className="text-xs font-normal text-gray-400">optional</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Supplier address"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Additional notes about this supplier..."
            />
          </div>

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
