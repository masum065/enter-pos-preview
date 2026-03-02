"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchase } from "@/hooks/usePurchases";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import type { CustomerOption } from "@/components/ui/customer-combobox";
import { AddCustomerModal } from "@/components/customers/customer-modals";
import Link from "next/link";

type PaymentMethod = "Cash" | "Bkash" | "Nagad" | "Card" | "Bank Transfer";
type Seller = CustomerOption;

const MIN_PRODUCT_SEARCH = 2;

// Product Combobox — fetches from server only when user types 2+ chars
function ProductCombobox({
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

  // Only fetch when user has typed enough — no upfront 500-product load
  const { data: productsData, isFetching } = useProducts({
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
              <p className="text-sm text-gray-500">No products found for &quot;{query}&quot;</p>
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

export default function PurchaseProductPage() {
  const router = useRouter();
  const createPurchaseMutation = useCreatePurchase();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    serialNumber: "",
    imei: "",
    purchasePrice: 0,
    paymentMethod: "Cash" as PaymentMethod,
    paidAmount: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [purchaseInvoice, setPurchaseInvoice] = useState<any>(null);

  const dueToSeller = formData.purchasePrice - formData.paidAmount;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSeller) newErrors.seller = "Please select a seller";
    if (!selectedProduct) newErrors.product = "Please select a product";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (formData.purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be greater than 0";
    if (formData.paidAmount < 0) newErrors.paidAmount = "Paid amount cannot be negative";
    if (formData.paidAmount > formData.purchasePrice) newErrors.paidAmount = "Paid amount cannot exceed purchase price";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedSeller || !selectedProduct) return;

    createPurchaseMutation.mutate(
      {
        serialNumber: formData.serialNumber.trim(),
        imei: formData.imei.trim() || undefined,
        productId: selectedProduct.id,
        purchasePrice: formData.purchasePrice,
        purchaseSource: "local",
        sellerId: selectedSeller.id,
        sellerName: selectedSeller.name,
        sellerPhone: selectedSeller.phone,
        productName: `${selectedProduct.brand} ${selectedProduct.modelName}`,
        purchaseDate: formData.purchaseDate,
        paymentMethod: formData.paymentMethod,
        paidAmount: formData.paidAmount,
        notes: formData.notes.trim() || undefined,
      } as any,
      {
        onSuccess: (result: any) => {
          // API returns { purchase, stockItem }
          setPurchaseInvoice(result.purchase ?? result);
        },
        onError: (error: any) => {
          console.error("Error creating purchase:", error);
        },
      },
    );
  };

  const handleReset = () => {
    setFormData({
      serialNumber: "",
      imei: "",
      purchasePrice: 0,
      paymentMethod: "Cash",
      paidAmount: 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setSelectedProduct(null);
    setSelectedSeller(null);
    setErrors({});
    setPurchaseInvoice(null);
  };

  // ── Invoice / Success View ──────────────────────────────────────────────
  if (purchaseInvoice) {
    const purchasePrice = parseFloat(purchaseInvoice.purchasePrice);
    const paidAmount = parseFloat(purchaseInvoice.paidAmount);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Invoice</h1>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Print Invoice
            </button>
            <button onClick={handleReset} className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
              New Purchase
            </button>
            <Link href="/inventory/stock" className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:text-gray-300">
              View Stock
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-purple-600">PURCHASE INVOICE</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Invoice #: {purchaseInvoice.invoiceNumber}</p>
            <p className="text-sm text-gray-500">
              Date: {new Date(purchaseInvoice.purchaseDate).toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Seller Information</h3>
              <p className="text-gray-600 dark:text-gray-400">{purchaseInvoice.sellerName}</p>
              <p className="text-gray-600 dark:text-gray-400">{purchaseInvoice.sellerPhone}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Purchase Details</h3>
              <p className="text-gray-600 dark:text-gray-400">Payment: {purchaseInvoice.paymentMethod}</p>
              <p className="text-gray-600 dark:text-gray-400">Amount Paid: ৳{paidAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Serial Number</th>
                  {purchaseInvoice.imei && <th className="px-4 py-3 text-left text-sm font-semibold">IMEI</th>}
                  <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3">{purchaseInvoice.productName}</td>
                  <td className="px-4 py-3 font-mono text-sm">{purchaseInvoice.serialNumber}</td>
                  {purchaseInvoice.imei && <td className="px-4 py-3 font-mono text-sm">{purchaseInvoice.imei}</td>}
                  <td className="px-4 py-3 text-right font-semibold">৳{purchasePrice.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between border-t-2 border-purple-600 pt-2">
                <span className="font-bold text-gray-900 dark:text-white">Total Amount:</span>
                <span className="text-xl font-bold text-purple-600">৳{purchasePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                <span className="font-semibold text-green-600">৳{paidAmount.toLocaleString()}</span>
              </div>
              {paidAmount < purchasePrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Balance Due to Seller:</span>
                  <span className="font-semibold text-red-600">৳{(purchasePrice - paidAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {purchaseInvoice.notes && (
            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Notes:</span> {purchaseInvoice.notes}
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-4 text-center text-sm text-gray-500 dark:border-gray-700">
            <p>Thank you for your business!</p>
            <p className="mt-1">This is a computer-generated invoice.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Purchase Form ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Product</h1>
          <p className="text-gray-600 dark:text-gray-400">Buy product from customer / seller</p>
        </div>
        <Link href="/purchases" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
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
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-4">
            <Link
              href="/purchases"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createPurchaseMutation.isPending}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-2.5 font-medium text-white shadow-lg disabled:opacity-60"
            >
              {createPurchaseMutation.isPending ? "Saving..." : "Complete Purchase"}
            </button>
          </div>
        </div>
      </form>

      {/* Add Seller Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        defaultName={customerSearchQuery}
        onCustomerAdded={(newCustomer) => {
          setSelectedSeller(newCustomer as Seller);
          setShowAddCustomerModal(false);
        }}
      />
    </div>
  );
}
