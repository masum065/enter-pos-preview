"use client";

import { useState, useRef, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import type { CustomerOption } from "@/components/ui/customer-combobox";
import Link from "next/link";

export type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";
export type Seller = CustomerOption;

const MIN_PRODUCT_SEARCH = 2;

export function ProductCombobox({
  selectedProduct,
  onSelect,
}: {
  selectedProduct: any | null;
  onSelect: (product: any | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldSearch = query.trim().length >= MIN_PRODUCT_SEARCH;

  const { data: productsData } = useProducts({
    search: query.trim(),
    limit: 10,
  }, shouldSearch);
  const filteredProducts = shouldSearch ? (productsData?.products || []) : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedProduct) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {selectedProduct.brand} {selectedProduct.modelName}
          </p>
          <p className="text-sm text-gray-500">{selectedProduct.category}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-lg px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Change
        </button>
      </div>
    );
  }

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
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type 2+ characters to search product..."
          className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {query.length > 0 && query.length < MIN_PRODUCT_SEARCH && (
        <p className="mt-1 text-xs text-gray-500">Type 1 more character to search...</p>
      )}
      {isOpen && shouldSearch && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product: any) => (
              <button
                key={product.id}
                type="button"
                onClick={() => { onSelect(product); setQuery(""); setIsOpen(false); }}
                className="flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {product.brand} {product.modelName}
                </p>
                <p className="text-sm text-gray-500">{product.category}</p>
              </button>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No products found for "{query}"</p>
              <Link href="/inventory/products" className="mt-2 inline-block text-sm text-purple-600 hover:underline dark:text-purple-400">
                Add new product →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface PurchaseFormData {
  serialNumber: string;
  imei: string;
  purchasePrice: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  purchaseDate: string;
  notes: string;
}

export function PurchaseFormFields({
  formData,
  setFormData,
  errors,
  selectedProduct,
  setSelectedProduct,
  selectedSeller,
  setSelectedSeller,
  setCustomerSearchQuery,
  setShowAddCustomerModal,
  isPending = false,
}: {
  formData: PurchaseFormData;
  setFormData: (data: PurchaseFormData) => void;
  errors: Record<string, string>;
  selectedProduct: any | null;
  setSelectedProduct: (p: any | null) => void;
  selectedSeller: Seller | null;
  setSelectedSeller: (s: Seller | null) => void;
  setCustomerSearchQuery: (q: string) => void;
  setShowAddCustomerModal: (v: boolean) => void;
  isPending?: boolean;
}) {
  const dueToSeller = formData.purchasePrice - formData.paidAmount;

  return (
    <div className="space-y-6">
      {/* Seller Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Seller (Customer)
        </h2>
        <CustomerCombobox
          selectedCustomer={selectedSeller}
          onSelect={setSelectedSeller}
          placeholder="Type 3+ characters to search seller..."
          onAddNew={(query) => {
            setCustomerSearchQuery(query);
            setShowAddCustomerModal(true);
          }}
        />
        {errors.seller && <p className="mt-2 text-sm text-red-500">{errors.seller}</p>}
      </div>

      {/* Product & Item Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Product Details</h2>

        {/* Product Selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Product <span className="text-red-500">*</span>
          </label>
          <ProductCombobox selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
          {errors.product && <p className="mt-1 text-sm text-red-500">{errors.product}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Serial Number */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              disabled={isPending}
              className={`w-full rounded-lg border px-4 py-2.5 font-mono dark:bg-gray-800 dark:text-white ${
                errors.serialNumber ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
              placeholder="Enter serial number"
            />
            {errors.serialNumber && <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>}
          </div>

          {/* IMEI */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              IMEI <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={formData.imei}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="For mobiles (optional)"
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Purchase Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
              <input
                type="number"
                value={formData.purchasePrice || ""}
                onChange={(e) => {
                  const price = Number(e.target.value);
                  setFormData({ ...formData, purchasePrice: price, paidAmount: price });
                }}
                disabled={isPending}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-4 dark:bg-gray-800 dark:text-white ${
                  errors.purchasePrice ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
                placeholder="0"
                min="0"
              />
            </div>
            {errors.purchasePrice && <p className="mt-1 text-sm text-red-500">{errors.purchasePrice}</p>}
          </div>

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

          {/* Paid Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paid Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
              <input
                type="number"
                value={formData.paidAmount || ""}
                onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                disabled={isPending}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-4 dark:bg-gray-800 dark:text-white ${
                  errors.paidAmount ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
                placeholder="0"
                min="0"
                max={formData.purchasePrice}
              />
            </div>
            {errors.paidAmount && <p className="mt-1 text-sm text-red-500">{errors.paidAmount}</p>}
          </div>

          {/* Purchase Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Payment Summary */}
        {formData.purchasePrice > 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Purchase Price:</span>
              <span className="font-medium">৳{formData.purchasePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Paid to Seller:</span>
              <span className="font-medium text-green-600">৳{formData.paidAmount.toLocaleString()}</span>
            </div>
            {dueToSeller > 0 && (
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Balance Due to Seller:</span>
                <span className="font-semibold text-red-600">৳{dueToSeller.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes <span className="text-xs font-normal text-gray-400">optional</span>
          </label>
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
    </div>
  );
}
