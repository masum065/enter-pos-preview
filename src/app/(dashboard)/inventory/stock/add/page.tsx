"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { ToastNotification } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";

interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: string;
  defaultSalePrice: string;
  description: string | null;
  [key: string]: any;
}

interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  balance: string;
  [key: string]: any;
}

const MIN_SEARCH_LENGTH = 2;

// Supplier Combobox Component
function SupplierCombobox({
  selectedSupplier,
  onSelect,
}: {
  selectedSupplier: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
}) {
  const { data: suppliersData } = useSuppliers();
  const suppliers: Supplier[] = (suppliersData?.suppliers || []) as any[];
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;

  const filteredSuppliers = useMemo(() => {
    if (!shouldSearch) return [];
    const q = query.toLowerCase();
    return suppliers.filter(s => 
      s.companyName?.toLowerCase().includes(q) || 
      s.contactPerson?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [query, shouldSearch, suppliers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSupplier = (supplier: Supplier) => {
    onSelect(supplier);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // Show dropdown only after 2 chars
  const showDropdown = isOpen && shouldSearch;
  const showNoResults = shouldSearch && filteredSuppliers.length === 0;

  return (
    <div className="relative">
      {/* Selected Supplier Display */}
      {selectedSupplier ? (
        <div className="flex items-center justify-between rounded-lg border border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-lg font-bold text-white">
              {selectedSupplier.companyName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.companyName || 'Unnamed Supplier'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSupplier.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Type 2+ characters to search supplier..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {query.length > 0 && query.length < MIN_SEARCH_LENGTH && (
              <p className="mt-1 text-xs text-gray-500">
                Type {MIN_SEARCH_LENGTH - query.length} more character{MIN_SEARCH_LENGTH - query.length > 1 ? "s" : ""} to search...
              </p>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              {/* Supplier List */}
              {filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelectSupplier(supplier)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                    {supplier.companyName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{supplier.companyName || 'Unnamed Supplier'}</p>
                    <p className="text-sm text-gray-500">{supplier.phone}</p>
                  </div>
                </button>
              ))}

              {/* No Results */}
              {showNoResults && (
                <div className="p-4 text-center">
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    No suppliers found for "{query}"
                  </p>
                  <Link
                    href="/suppliers"
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Supplier
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wrapper component for Suspense
export default function AddStockPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>}>
      <AddStockContent />
    </Suspense>
  );
}

function AddStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Server-side product search — no upfront 500-item load
  const [productQuery, setProductQuery] = useState("");
  const shouldFetchProducts = productQuery.trim().length >= MIN_SEARCH_LENGTH;
  const { data: productsData, isFetching: productsFetching } = useProducts(
    { search: productQuery.trim(), limit: 10 },
    shouldFetchProducts
  );
  const products: Product[] = shouldFetchProducts ? (productsData?.products || []) as any[] : [];

  // Get productId from URL if provided
  const preSelectedProductId = searchParams.get("productId") || "";

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selectedProduct, setSelectedProduct] = useState<string>(preSelectedProductId);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    serialNumber: "",
    imei: "",
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [bulkSerials, setBulkSerials] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast, showToast } = useToast();

  // Get selected product details
  const selectedProductDetails = products.find((p) => p.id === selectedProduct);

  // Set initial purchase price when product is pre-selected
  useEffect(() => {
    if (preSelectedProductId && formData.purchasePrice === 0) {
      const product = products.find((p) => p.id === preSelectedProductId);
      if (product) {
      setFormData((prev) => ({
          ...prev,
          purchasePrice: Math.round(parseFloat(product.defaultSalePrice) * 0.85),
        }));
      }
    }
  }, [preSelectedProductId, products]);

  const validateSingle = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedProduct) newErrors.product = "Please select a product";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (formData.purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be greater than 0";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSingle()) return;

    try {
      await apiClient.post("/api/stock", {
        serialNumber: formData.serialNumber.trim(),
        imei: formData.imei.trim() || undefined,
        productId: selectedProduct,
        purchasePrice: formData.purchasePrice,
        supplierId: selectedSupplier?.id || undefined,
        supplierName: selectedSupplier?.companyName || undefined,
        purchaseSource: "supplier",
        purchaseDate: formData.purchaseDate,
        status: "Available",
        notes: formData.notes.trim() || undefined,
      });

      showToast("Stock item added successfully!");
      setFormData({
        serialNumber: "",
        imei: "",
        purchasePrice: formData.purchasePrice,
        purchaseDate: formData.purchaseDate,
        notes: "",
      });
    } catch (error) {
      showToast((error as Error).message || "Failed to add stock item.", "error");
      setErrors({ submit: (error as Error).message });
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
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
      supplierId: selectedSupplier?.id || undefined,
      supplierName: selectedSupplier?.companyName || undefined,
      purchaseSource: "supplier" as const,
      purchaseDate: formData.purchaseDate,
      status: "Available" as const,
    }));

    try {
      const result = await apiClient.post("/api/stock/bulk", { items }) as any;
      showToast(`${result?.added || serials.length} items added to stock successfully!`);
      setBulkSerials("");
    } catch (error) {
      showToast((error as Error).message || "Failed to add bulk stock.", "error");
      setErrors({ submit: (error as Error).message });
    }
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
            <ProductSearchSelect
              products={products}
              selectedProductId={selectedProduct}
              onSearch={setProductQuery}
              onSelect={(productId) => {
                setSelectedProduct(productId);
                const product = products.find((p) => p.id === productId);
                if (product && formData.purchasePrice === 0) {
                setFormData((prev) => ({
                    ...prev,
                    purchasePrice: Math.round(parseFloat(product.defaultSalePrice) * 0.85),
                  }));
                }
              }}
              hasError={!!errors.product}
            />
            {errors.product && <p className="mt-1 text-sm text-red-500">{errors.product}</p>}
          </div>

          {selectedProductDetails && (
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="font-medium text-blue-900 dark:text-blue-300">
                {selectedProductDetails.brand} {selectedProductDetails.modelName}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
              Sale Price: {formatCurrency(parseFloat(selectedProductDetails.defaultSalePrice))}
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

              <div className="grid gap-4 md:grid-cols-2">
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
                  Supplier (Optional)
                </label>
                <SupplierCombobox
                  selectedSupplier={selectedSupplier}
                  onSelect={setSelectedSupplier}
                />
              </div>
            </>
          ) : (
            /* Bulk Entry Form */
            <>
              <div className="grid gap-4 md:grid-cols-2">
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
                  Supplier (Optional)
                </label>
                <SupplierCombobox
                  selectedSupplier={selectedSupplier}
                  onSelect={setSelectedSupplier}
                />
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

      <ToastNotification toast={toast} />
    </div>
  );
}

// Searchable Product Select Component
function ProductSearchSelect({
  products,
  selectedProductId,
  onSelect,
  onSearch,
  hasError = false,
}: {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  onSearch?: (query: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // If onSearch is provided, products are filtered by server.
  // Otherwise filter locally.
  const filteredProducts = useMemo(() => {
    if (onSearch) return products.slice(0, 5); // server gives filtered results
    if (!query.trim()) return products.slice(0, 5);
    const q = query.toLowerCase();
    return products
      .filter((p) =>
        p.modelName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        `${p.brand} ${p.modelName}`.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, query, onSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProduct = (product: Product) => {
    onSelect(product.id);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {selectedProductId && selectedProduct ? (
        // Selected Product Display
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${hasError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-800 dark:text-blue-300">
              {selectedProduct.brand.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedProduct.brand} {selectedProduct.modelName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sale Price: {formatCurrency(parseFloat(selectedProduct.defaultSalePrice))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Search Input
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search products by MINIMUM 2 chars..."
            className={`w-full rounded-lg border py-3 pl-12 pr-4 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
              hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
            }`}
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selectedProductId && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-500">
              <p>No products found</p>
              <p className="mt-1 text-sm">Try a different search term</p>
            </div>
          ) : (
            <>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {product.brand.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.brand} {product.modelName}
                    </p>
                    <p className="text-sm text-gray-500">{product.category} • {formatCurrency(parseFloat(product.defaultSalePrice))}</p>
                  </div>
                </button>
              ))}

              {filteredProducts.length > 0 && products.length > 5 && !query && (
                <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-700">
                  Type to search {products.length} products...
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
