"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateService } from "@/hooks/useServices";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import type { CustomerOption } from "@/components/ui/customer-combobox";
import Link from "next/link";

type Customer = CustomerOption;

export default function NewServicePage() {
  const router = useRouter();
  const createServiceMutation = useCreateService();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    deviceType: "Mobile" as "Laptop" | "Mobile" | "Tablet" | "Other",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    imei: "",
    estimatedCost: 0,
    serviceCharge: 0,
    partsCost: 0,
    expectedDays: 3,
    notes: "",
  });

  // Multi-problem list
  const [problems, setProblems] = useState<string[]>([""]);
  const addProblem = () => setProblems([...problems, ""]);
  const removeProblem = (index: number) => {
    if (problems.length <= 1) return;
    setProblems(problems.filter((_, i) => i !== index));
  };
  const updateProblem = (index: number, value: string) => {
    const updated = [...problems];
    updated[index] = value;
    setProblems(updated);
  };

  const [errors, setErrors] = useState<Record<string, string>>({});



  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCustomer) newErrors.customer = "Please select a customer";
    if (!formData.deviceBrand.trim()) newErrors.deviceBrand = "Device brand is required";
    if (!formData.deviceModel.trim()) newErrors.deviceModel = "Device model is required";
    const validProblems = problems.filter(p => p.trim());
    if (validProblems.length === 0) newErrors.problems = "At least one problem is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedCustomer) return;

    const validProblems = problems.filter(p => p.trim());
    const problemDescription = validProblems.join("\n");
    const totalCost = formData.serviceCharge + formData.partsCost;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + formData.expectedDays);

    createServiceMutation.mutate({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      deviceType: formData.deviceType,
      deviceBrand: formData.deviceBrand,
      deviceModel: formData.deviceModel,
      serialNumber: formData.serialNumber || undefined,
      imei: formData.imei || undefined,
      problemDescription,
      receivedDate: new Date().toISOString(),
      expectedDeliveryDate: expectedDate.toISOString(),
      estimatedCost: formData.estimatedCost || totalCost,
      serviceCharge: formData.serviceCharge,
      partsCost: formData.partsCost,
      totalCost,
      status: "Received",
      paymentStatus: "Pending",
      paidAmount: 0,
      dueAmount: totalCost,
      notes: formData.notes || undefined,
    } as any, {
      onSuccess: () => router.push("/services"),
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Service Entry</h1>
          <p className="text-gray-600 dark:text-gray-400">Register a device for repair</p>
        </div>
        <Link href="/services" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Customer</h2>
          
          <CustomerCombobox
            selectedCustomer={selectedCustomer}
            onSelect={setSelectedCustomer}
          />
          {errors.customer && <p className="mt-2 text-sm text-red-500">{errors.customer}</p>}
        </div>

        {/* Device Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Device Information</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Device Type</label>
              <select
                value={formData.deviceType}
                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as typeof formData.deviceType })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Mobile">Mobile</option>
                <option value="Laptop">Laptop</option>
                <option value="Tablet">Tablet</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Brand *</label>
              <input
                type="text"
                value={formData.deviceBrand}
                onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${errors.deviceBrand ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
                placeholder="Apple, Samsung..."
              />
              {errors.deviceBrand && <p className="mt-1 text-sm text-red-500">{errors.deviceBrand}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Model *</label>
              <input
                type="text"
                value={formData.deviceModel}
                onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${errors.deviceModel ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
                placeholder="iPhone 15 Pro, Galaxy S24..."
              />
              {errors.deviceModel && <p className="mt-1 text-sm text-red-500">{errors.deviceModel}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">Problems / Issues *</label>
            <div className="space-y-2">
              {problems.map((problem, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={problem}
                    onChange={(e) => updateProblem(index, e.target.value)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${errors.problems ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
                    placeholder={index === 0 ? "e.g. Screen not working" : "Another problem..."}
                  />
                  {problems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProblem(index)}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addProblem}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Problem
            </button>
            {errors.problems && <p className="mt-1 text-sm text-red-500">{errors.problems}</p>}
          </div>
        </div>

        {/* Cost & Timeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cost & Timeline</h2>
            <span className="text-xs text-gray-400">Costs can be updated later after diagnosis</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Service Charge (৳) <span className="text-xs font-normal text-gray-400">optional</span></label>
              <input
                type="number"
                value={formData.serviceCharge}
                onChange={(e) => setFormData({ ...formData, serviceCharge: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Parts Cost (৳) <span className="text-xs font-normal text-gray-400">optional</span></label>
              <input
                type="number"
                value={formData.partsCost}
                onChange={(e) => setFormData({ ...formData, partsCost: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Expected Days</label>
              <input
                type="number"
                value={formData.expectedDays}
                onChange={(e) => setFormData({ ...formData, expectedDays: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min="1"
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Cost</span>
              <span>৳{(formData.serviceCharge + formData.partsCost).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <label className="mb-2 block text-sm font-medium">Additional Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/services" className="rounded-lg border border-gray-300 px-6 py-2.5 text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-2.5 font-medium text-white shadow-lg"
          >
            Create Service Entry
          </button>
        </div>
      </form>
    </div>
  );
}
