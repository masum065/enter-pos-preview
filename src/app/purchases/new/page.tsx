"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupplierStore, Supplier } from "@/stores/supplierStore";
import { usePurchaseStore, PurchaseItem } from "@/stores/purchaseStore";
import { useProductStore, Product } from "@/stores/productStore";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const MIN_SEARCH_LENGTH = 2;

// Supplier Combobox
function SupplierCombobox({
  selectedSupplier,
  onSelect,
}: {
  selectedSupplier: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
}) {
  const { suppliers, searchSuppliers } = useSupplierStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;

  const filteredSuppliers = useMemo(() => {
    if (!shouldSearch) return [];
    return searchSuppliers(query).slice(0, 10);
  }, [query, shouldSearch, searchSuppliers]);

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

  const handleSelect = (supplier: Supplier) => {
    onSelect(supplier);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && shouldSearch;

  return (
    <div className="relative">
      {selectedSupplier ? (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
              {selectedSupplier.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedSupplier.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedSupplier.companyName && `${selectedSupplier.companyName} • `}
                {selectedSupplier.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Change
          </button>
        </div>
      ) : (
        <>
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
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search supplier by name, phone, or company..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              {filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No suppliers found for "{query}"
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{supplier.name}</p>
                      <p className="text-sm text-gray-500">
                        {supplier.companyName && `${supplier.companyName} • `}
                        {supplier.phone}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Product Combobox for adding items
function ProductCombobox({
  onSelectProduct,
}: {
  onSelectProduct: (product: Product) => void;
}) {
  const { products, searchProducts } = useProductStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;

  const filteredProducts = useMemo(() => {
    if (!shouldSearch) return [];
    return searchProducts(query).slice(0, 10);
  }, [query, shouldSearch, searchProducts]);

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

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && shouldSearch;

  return (
    <div className="relative">
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
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search product by name or model..."
          className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No products found for "{query}"
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.brand} {product.modelName}
                  </p>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {formatCurrency(product.defaultSalePrice)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface PurchaseItemForm {
  id: string;
  productId: string;
  productName: string;
  serialNumber: string;
  unitPrice: number;
}

function NewPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get("supplier");

  const { getSupplierById } = useSupplierStore();
  const { createPurchase } = usePurchaseStore();
  const { products } = useProductStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<PurchaseItemForm[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setIsLoaded(true);
    if (preselectedSupplierId) {
      const supplier = getSupplierById(preselectedSupplierId);
      if (supplier) {
        setSelectedSupplier(supplier);
      }
    }
  }, [preselectedSupplierId, getSupplierById]);

  // Add product to items
  const handleAddProduct = (product: Product) => {
    const newItem: PurchaseItemForm = {
      id: `item_${Date.now()}`,
      productId: product.id,
      productName: `${product.brand} ${product.modelName}`,
      serialNumber: "",
      unitPrice: 0, // User should enter purchase price
    };
    setItems([...items, newItem]);
  };

  // Update item
  const handleUpdateItem = (itemId: string, field: keyof PurchaseItemForm, value: string | number) => {
    setItems(items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice, 0);
  const totalAmount = subtotal - discount;
  const dueAmount = totalAmount - paidAmount;

  // Validation
  const isValid = useMemo(() => {
    if (!selectedSupplier) return false;
    if (items.length === 0) return false;
    if (items.some((item) => !item.serialNumber.trim())) return false;
    return true;
  }, [selectedSupplier, items]);

  // Submit
  const handleSubmit = () => {
    if (!selectedSupplier || !isValid) return;

    const purchaseItems: PurchaseItem[] = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      serialNumber: item.serialNumber.trim().toUpperCase(),
      quantity: 1,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice,
    }));

    createPurchase({
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      purchaseDate: new Date(purchaseDate).toISOString(),
      items: purchaseItems,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      dueAmount: Math.max(0, dueAmount),
      notes: notes.trim() || undefined,
      createdBy: "admin",
    });

    router.push("/suppliers");
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Purchase</h1>
          <p className="text-gray-600 dark:text-gray-400">Record a purchase from supplier</p>
        </div>
        <Link
          href="/suppliers"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Cancel
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Supplier Selection */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Select Supplier</h2>
            <SupplierCombobox selectedSupplier={selectedSupplier} onSelect={setSelectedSupplier} />
          </div>

          {/* Add Products */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add Products</h2>
            <ProductCombobox onSelectProduct={handleAddProduct} />

            {/* Items List */}
            {items.length === 0 ? (
              <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <p className="text-gray-500">No products added yet. Search for a product above.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={item.serialNumber}
                          onChange={(e) => handleUpdateItem(item.id, "serialNumber", e.target.value.toUpperCase())}
                          placeholder="Serial Number *"
                          className={`rounded-lg border px-3 py-2 font-mono text-sm dark:bg-gray-800 dark:text-white ${
                            !item.serialNumber.trim() ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-700"
                          }`}
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">৳</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, "unitPrice", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-7 text-right dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="self-start text-red-500 hover:text-red-700 sm:self-center"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Notes (Optional)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Additional notes about this purchase..."
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Purchase Summary</h2>

            {/* Purchase Date */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Items</span>
                <span className="font-medium text-gray-900 dark:text-white">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-right dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  min={0}
                />
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-6 border-t pt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min={0}
              />
              <div className="mt-3 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Due Amount</span>
                <span className={`font-bold ${dueAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {formatCurrency(Math.max(0, dueAmount))}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              Save Purchase
            </button>

            {!isValid && items.length > 0 && (
              <p className="mt-2 text-center text-sm text-red-500">
                Please fill all serial numbers
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    }>
      <NewPurchaseContent />
    </Suspense>
  );
}
