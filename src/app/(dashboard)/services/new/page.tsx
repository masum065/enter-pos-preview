"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useServiceStore, ServiceStatus } from "@/stores/serviceStore";
import { useCustomerStore, Customer } from "@/stores/customerStore";
import Link from "next/link";

export default function NewServicePage() {
  const router = useRouter();
  const serviceStore = useServiceStore();
  const customerStore = useCustomerStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    deviceType: "Mobile" as "Laptop" | "Mobile" | "Tablet" | "Other",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    imei: "",
    problemDescription: "",
    estimatedCost: 0,
    serviceCharge: 0,
    partsCost: 0,
    expectedDays: 3,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Search customers
  const filteredCustomers = customerSearch.trim()
    ? customerStore.searchCustomers(customerSearch).slice(0, 5)
    : customerStore.customers.slice(0, 5);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCustomer) newErrors.customer = "Please select a customer";
    if (!formData.deviceBrand.trim()) newErrors.deviceBrand = "Device brand is required";
    if (!formData.deviceModel.trim()) newErrors.deviceModel = "Device model is required";
    if (!formData.problemDescription.trim()) newErrors.problemDescription = "Problem description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedCustomer) return;

    const totalCost = formData.serviceCharge + formData.partsCost;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + formData.expectedDays);

    serviceStore.createService({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      deviceType: formData.deviceType,
      deviceBrand: formData.deviceBrand,
      deviceModel: formData.deviceModel,
      serialNumber: formData.serialNumber || undefined,
      imei: formData.imei || undefined,
      problemDescription: formData.problemDescription,
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
      createdBy: "admin",
    });

    router.push("/services");
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

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
          
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customer..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {errors.customer && <p className="mt-1 text-sm text-red-500">{errors.customer}</p>}

          {selectedCustomer ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-red-600">Remove</button>
            </div>
          ) : (
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </button>
              ))}
            </div>
          )}
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
            <label className="mb-2 block text-sm font-medium">Problem Description *</label>
            <textarea
              value={formData.problemDescription}
              onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
              rows={3}
              className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${errors.problemDescription ? "border-red-500" : "border-gray-300 dark:border-gray-700"}`}
              placeholder="Describe the issue..."
            />
            {errors.problemDescription && <p className="mt-1 text-sm text-red-500">{errors.problemDescription}</p>}
          </div>
        </div>

        {/* Cost & Timeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Cost & Timeline</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Service Charge (৳)</label>
              <input
                type="number"
                value={formData.serviceCharge}
                onChange={(e) => setFormData({ ...formData, serviceCharge: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min="0"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Parts Cost (৳)</label>
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
