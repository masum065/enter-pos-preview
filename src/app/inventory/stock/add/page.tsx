"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStockStore } from "@/stores/stockStore";
import { useProductStore, Product } from "@/stores/productStore";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function AddStockPage() {
  const router = useRouter();
  const { addStockItem, addBulkStock, checkDuplicateSerial } = useStockStore();
  const { products } = useProductStore();

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [formData, setFormData] = useState({
    serialNumber: "",
    imei: "",
    purchasePrice: 0,
    supplierName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [bulkSerials, setBulkSerials] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Get selected product details
  const selectedProductDetails = products.find((p) => p.id === selectedProduct);

  const validateSingle = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedProduct) newErrors.product = "Please select a product";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (formData.serialNumber && checkDuplicateSerial(formData.serialNumber)) {
      newErrors.serialNumber = "This serial number already exists";
    }
    if (formData.purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be greater than 0";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSingle()) return;

    try {
      addStockItem({
        serialNumber: formData.serialNumber.trim(),
        imei: formData.imei.trim() || undefined,
        productId: selectedProduct,
        purchasePrice: formData.purchasePrice,
        supplierName: formData.supplierName.trim() || undefined,
        purchaseDate: formData.purchaseDate,
        status: "Available",
        notes: formData.notes.trim() || undefined,
      });

      setSuccessMessage("Stock item added successfully!");
      setFormData({
        serialNumber: "",
        imei: "",
        purchasePrice: formData.purchasePrice,
        supplierName: formData.supplierName,
        purchaseDate: formData.purchaseDate,
        notes: "",
      });

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrors({ submit: (error as Error).message });
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      setErrors({ product: "Please select a product" });
      return;
    }

    if (!bulkSerials.trim()) {
      setErrors({ bulkSerials: "Please enter at least one serial number" });
      return;
    }

    const serials = bulkSerials
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (serials.length === 0) {
      setErrors({ bulkSerials: "Please enter valid serial numbers" });
      return;
    }

    const items = serials.map((serial) => ({
      serialNumber: serial,
      productId: selectedProduct,
      purchasePrice: formData.purchasePrice,
      supplierName: formData.supplierName.trim() || undefined,
      purchaseDate: formData.purchaseDate,
      status: "Available" as const,
    }));

    const added = addBulkStock(items);
    
    setSuccessMessage(`${added.length} of ${serials.length} items added successfully!`);
    setBulkSerials("");
    
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Stock</h1>
          <p className="text-gray-600 dark:text-gray-400">Add new items to inventory</p>
        </div>
        <Link
          href="/inventory/stock"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          ← Back to Stock
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode("single")}
          className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
            mode === "single"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Single Item</p>
          <p className="text-sm opacity-75">Add one item at a time</p>
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
            mode === "bulk"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <p className="font-medium">Bulk Entry</p>
          <p className="text-sm opacity-75">Add multiple items quickly</p>
        </button>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <form onSubmit={mode === "single" ? handleSingleSubmit : handleBulkSubmit} className="space-y-6">
          {/* Product Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                const product = products.find((p) => p.id === e.target.value);
                if (product && formData.purchasePrice === 0) {
                  setFormData((prev) => ({
                    ...prev,
                    purchasePrice: Math.round(product.defaultSalePrice * 0.85),
                  }));
                }
              }}
              className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                errors.product ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
              }`}
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.brand} {product.modelName} - {formatCurrency(product.defaultSalePrice)}
                </option>
              ))}
            </select>
            {errors.product && <p className="mt-1 text-sm text-red-500">{errors.product}</p>}
          </div>

          {selectedProductDetails && (
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="font-medium text-blue-900 dark:text-blue-300">
                {selectedProductDetails.brand} {selectedProductDetails.modelName}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {selectedProductDetails.description} • Sale Price: {formatCurrency(selectedProductDetails.defaultSalePrice)}
              </p>
            </div>
          )}

          {mode === "single" ? (
            /* Single Item Form */
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                    className={`w-full rounded-lg border px-4 py-3 font-mono text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                      errors.serialNumber ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
                    }`}
                    placeholder="C02X1234LVDL"
                  />
                  {errors.serialNumber && <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    IMEI (for Mobile)
                  </label>
                  <input
                    type="text"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="356789012345678"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Purchase Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                    <input
                      type="number"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      className={`w-full rounded-lg border py-3 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                        errors.purchasePrice ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
                      }`}
                      min="0"
                    />
                  </div>
                  {errors.purchasePrice && <p className="mt-1 text-sm text-red-500">{errors.purchasePrice}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Bulk Entry Form */
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Purchase Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                    <input
                      type="number"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Serial Numbers <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-gray-500">(One per line)</span>
                </label>
                <textarea
                  value={bulkSerials}
                  onChange={(e) => setBulkSerials(e.target.value.toUpperCase())}
                  rows={8}
                  className={`w-full rounded-lg border px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                    errors.bulkSerials ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
                  }`}
                  placeholder="C02X1234LVDL&#10;C02X5678ABCD&#10;C02X9012EFGH"
                />
                {errors.bulkSerials && <p className="mt-1 text-sm text-red-500">{errors.bulkSerials}</p>}
                <p className="mt-2 text-sm text-gray-500">
                  {bulkSerials.split("\n").filter((s) => s.trim()).length} serial numbers entered
                </p>
              </div>
            </>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            <Link
              href="/inventory/stock"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
            >
              {mode === "single" ? "Add Stock Item" : "Add All Items"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
