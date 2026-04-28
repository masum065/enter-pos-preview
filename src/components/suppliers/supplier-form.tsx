"use client";

import { useEffect } from "react";

export interface SupplierFormData {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export function SupplierFormFields({
  formData,
  setFormData,
  errors,
  isPending = false,
}: {
  formData: SupplierFormData;
  setFormData: (data: SupplierFormData) => void;
  errors: Record<string, string>;
  isPending?: boolean;
}) {
  return (
    <div className="space-y-4 text-left">
      {/* Company Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Company / Supplier Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          disabled={isPending}
          className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
            errors.companyName ? "border-red-500" : "border-gray-300 dark:border-gray-700"
          }`}
          placeholder="e.g. Samsung Electronics BD"
          autoFocus
        />
        {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Phone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={isPending}
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
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Address <span className="text-xs font-normal text-gray-400">optional</span>
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Supplier address"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes <span className="text-xs font-normal text-gray-400">optional</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={isPending}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Additional notes about this supplier..."
        />
      </div>
    </div>
  );
}
