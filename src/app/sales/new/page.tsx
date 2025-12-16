"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSalesStore, Sale, SaleItem, PaymentMethod, calculateSaleItem, calculateSaleTotals } from "@/stores/salesStore";
import { useCustomerStore, Customer } from "@/stores/customerStore";
import { useProductStore } from "@/stores/productStore";
import { useStockStore, StockItem } from "@/stores/stockStore";
import { formatCurrency } from "@/lib/utils";
import { AddCustomerModal } from "@/components/customers/customer-modals";
import { InvoicePrintModal } from "@/components/invoice/invoice-print";
import Link from "next/link";

type Step = 1 | 2 | 3;

const MIN_SEARCH_LENGTH = 3;

// Customer Combobox Component with 3 char minimum
function CustomerCombobox({
  selectedCustomer,
  onSelect,
  onAddNew,
}: {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onAddNew: () => void;
}) {
  const { customers, searchCustomers } = useCustomerStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only search when 3+ characters
  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!shouldSearch) return [];
    return searchCustomers(query).slice(0, 10);
  }, [query, shouldSearch, searchCustomers]);

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

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // Show dropdown only after 3 chars
  const showDropdown = isOpen && shouldSearch;
  const showNoResults = shouldSearch && filteredCustomers.length === 0;

  return (
    <div className="relative">
      {/* Selected Customer Display */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
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
              placeholder="Type 3+ characters to search customer..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
              {/* Customer List */}
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  </div>
                </button>
              ))}

              {/* No Results - Show Add New Button */}
              {showNoResults && (
                <div className="p-4 text-center">
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    No customer found for &quot;{query}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Customer
                  </button>
                </div>
              )}

              {/* Add New at bottom if has results */}
              {!showNoResults && filteredCustomers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                  className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-blue-600 transition-colors hover:bg-blue-50 dark:border-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Customer
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Serial Number Combobox with auto-suggest
function SerialCombobox({
  onSelectSerial,
  addedSerials,
}: {
  onSelectSerial: (stockItem: StockItem) => void;
  addedSerials: string[];
}) {
  const stockStore = useStockStore();
  const productStore = useProductStore();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available stock items
  const availableStock = useMemo(() => {
    return stockStore.stockItems.filter(
      (item) => item.status === "Available" && !addedSerials.includes(item.serialNumber)
    );
  }, [stockStore.stockItems, addedSerials]);

  // Filter by query (min 3 chars)
  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;
  
  const filteredStock = useMemo(() => {
    if (!shouldSearch) return [];
    const q = query.toUpperCase();
    return availableStock
      .filter((item) => {
        // Search by serial number
        if (item.serialNumber.includes(q)) return true;
        // Search by product name
        const product = productStore.products.find((p) => p.id === item.productId);
        if (product) {
          const productName = `${product.brand} ${product.modelName}`.toUpperCase();
          if (productName.includes(q)) return true;
        }
        return false;
      })
      .slice(0, 10);
  }, [query, shouldSearch, availableStock, productStore.products]);

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

  const handleSelectStock = (stockItem: StockItem) => {
    onSelectSerial(stockItem);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getProductName = (productId: string) => {
    const product = productStore.products.find((p) => p.id === productId);
    return product ? `${product.brand} ${product.modelName}` : "Unknown Product";
  };

  const showDropdown = isOpen && shouldSearch;
  const showNoResults = shouldSearch && filteredStock.length === 0;

  return (
    <div className="relative flex-1">
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
            setQuery(e.target.value.toUpperCase());
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type 3+ chars to search serial/product..."
          className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 font-mono transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Helper text */}
      {query.length > 0 && query.length < MIN_SEARCH_LENGTH && (
        <p className="mt-1 text-xs text-gray-500">
          Type {MIN_SEARCH_LENGTH - query.length} more character{MIN_SEARCH_LENGTH - query.length > 1 ? "s" : ""} to search...
        </p>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Stock List */}
          {filteredStock.map((stockItem) => (
            <button
              key={stockItem.id}
              type="button"
              onClick={() => handleSelectStock(stockItem)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div>
                <p className="font-mono font-medium text-gray-900 dark:text-white">
                  {stockItem.serialNumber}
                </p>
                <p className="text-sm text-gray-500">{getProductName(stockItem.productId)}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Available
                </span>
              </div>
            </button>
          ))}

          {/* No Results */}
          {showNoResults && (
            <div className="p-4 text-center">
              <div className="mb-2 flex justify-center">
                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No product/serial found for &quot;{query}&quot;
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Check the serial number or add stock first
              </p>
            </div>
          )}

          {/* Available count */}
          {!showNoResults && filteredStock.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500 dark:border-gray-800">
              {availableStock.length} items available in stock
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewSalePage() {
  const router = useRouter();
  const salesStore = useSalesStore();
  const productStore = useProductStore();
  const stockStore = useStockStore();

  const [step, setStep] = useState<Step>(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Step 1: Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Step 2: Items
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Step 3: Payment
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [notes, setNotes] = useState("");

  // Completed sale for print
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Handle new customer added
  const handleCustomerAdded = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  // Calculate totals
  const totals = useMemo(() => {
    return calculateSaleTotals(saleItems, discount, 0);
  }, [saleItems, discount]);

  // Calculate remaining amount
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totals.grandTotal - paidTotal;

  // Get list of already added serials
  const addedSerials = useMemo(() => saleItems.map((item) => item.serialNumber), [saleItems]);

  // Add item from stock selection
  const handleAddFromStock = (stockItem: StockItem) => {
    const product = productStore.products.find((p) => p.id === stockItem.productId);
    if (!product) return;

    const salePrice = product.defaultSalePrice;
    const { amount, profit } = calculateSaleItem(salePrice, stockItem.purchasePrice, 0);

    const newItem: SaleItem = {
      id: `item_${Date.now()}`,
      productId: product.id,
      stockItemId: stockItem.id,
      serialNumber: stockItem.serialNumber,
      productName: `${product.brand} ${product.modelName}`,
      quantity: 1,
      salePrice,
      purchasePrice: stockItem.purchasePrice,
      discount: 0,
      amount,
      profit,
    };

    setSaleItems([...saleItems, newItem]);
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setSaleItems(saleItems.filter((item) => item.id !== itemId));
  };

  // Update item price
  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setSaleItems(
      saleItems.map((item) => {
        if (item.id !== itemId) return item;

        // Allow any price but calculate proper profit (can be negative)
        const { amount, profit } = calculateSaleItem(newPrice, item.purchasePrice, item.discount);
        return { ...item, salePrice: newPrice, amount, profit };
      })
    );
  };

  // Check if any item has invalid price (below purchase price)
  const hasInvalidPrices = useMemo(() => {
    return saleItems.some((item) => item.salePrice < item.purchasePrice);
  }, [saleItems]);

  // Add payment
  const handleAddPayment = () => {
    if (paymentAmount <= 0) return;
    if (paymentAmount > remaining) {
      setPaymentAmount(remaining);
      return;
    }
    setPayments([...payments, { method: paymentMethod, amount: paymentAmount }]);
    setPaymentAmount(0);
  };

  // Remove payment
  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Submit sale
  const handleSubmit = () => {
    if (!selectedCustomer) return;
    if (saleItems.length === 0) return;

    // Create sale
    const sale = salesStore.createSale({
      invoiceDate: new Date().toISOString(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      items: saleItems,
      subtotal: totals.subtotal,
      discountAmount: discount,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: totals.grandTotal,
      payments: payments.map((p, i) => ({
        id: `pay_${Date.now()}_${i}`,
        ...p,
        paidAt: new Date().toISOString(),
      })),
      paidAmount: paidTotal,
      dueAmount: remaining > 0 ? remaining : 0,
      totalProfit: totals.totalProfit,
      status: remaining <= 0 ? "completed" : paidTotal > 0 ? "partial" : "pending",
      notes,
      createdBy: "admin",
    });

    // Mark stock items as sold
    saleItems.forEach((item) => {
      stockStore.markAsSold(item.stockItemId, sale.id);
    });

    // Show print modal with completed sale
    setCompletedSale(sale);
    setShowPrintModal(true);
  };

  // Handle closing print modal and redirecting
  const handleClosePrintModal = () => {
    setShowPrintModal(false);
    router.push("/sales");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Invoice</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new sales invoice</p>
        </div>
        <Link
          href="/sales"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Cancel
        </Link>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              }`}
            >
              {s}
            </div>
            <span
              className={`hidden sm:block ${step >= s ? "font-medium text-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              {s === 1 ? "Customer" : s === 2 ? "Items" : "Payment"}
            </span>
            {s < 3 && <div className="h-0.5 w-8 bg-gray-200 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Customer</h2>

            <CustomerCombobox
              selectedCustomer={selectedCustomer}
              onSelect={setSelectedCustomer}
              onAddNew={() => setShowAddCustomerModal(true)}
            />

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedCustomer}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white disabled:opacity-50"
              >
                Next: Add Items
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Items */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Items</h2>

            {/* Serial Search Combobox */}
            <SerialCombobox
              onSelectSerial={handleAddFromStock}
              addedSerials={addedSerials}
            />

            {/* Items List */}
            {saleItems.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <p className="text-gray-500">No items added yet. Search for a serial number above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saleItems.map((item) => {
                  const isPriceTooLow = item.salePrice < item.purchasePrice;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 ${
                        isPriceTooLow 
                          ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20" 
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                        <p className="font-mono text-sm text-gray-500">{item.serialNumber}</p>
                        <p className="text-xs text-gray-400">Cost: {formatCurrency(item.purchasePrice)}</p>
                      </div>
                      <div className="text-right">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                          <input
                            type="number"
                            value={item.salePrice}
                            onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                            className={`w-32 rounded border px-2 py-1.5 pl-6 text-right ${
                              isPriceTooLow
                                ? "border-red-500 bg-red-50 text-red-700 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-300"
                                : "border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            }`}
                            min={0}
                          />
                        </div>
                        {isPriceTooLow ? (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            Min: {formatCurrency(item.purchasePrice)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Profit: {formatCurrency(item.profit)}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error Alert */}
            {hasInvalidPrices && saleItems.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium">
                  Sale price cannot be lower than purchase price. Please fix the highlighted items.
                </p>
              </div>
            )}

            {/* Subtotal */}
            {saleItems.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Subtotal ({saleItems.length} items)</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:text-gray-300"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setPaymentAmount(totals.grandTotal);
                  setStep(3);
                }}
                disabled={saleItems.length === 0 || hasInvalidPrices}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next: Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h2>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-32 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-700"
                    min={0}
                  />
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Profit</span>
                  <span>{formatCurrency(totals.totalProfit)}</span>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="space-y-3">
              <h3 className="font-medium">Payments</h3>

              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <span className="font-medium text-green-800 dark:text-green-400">{p.method}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-800 dark:text-green-400">{formatCurrency(p.amount)}</span>
                    <button onClick={() => handleRemovePayment(i)} className="text-red-500">
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {remaining > 0 && (
                <div className="flex gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bkash">Bkash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Amount"
                    max={remaining}
                  />
                  <button onClick={handleAddPayment} className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white">
                    Add
                  </button>
                </div>
              )}

              <div className="flex justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <span className="font-medium">Paid</span>
                <span className="font-bold text-blue-800 dark:text-blue-400">{formatCurrency(paidTotal)}</span>
              </div>

              {remaining > 0 && (
                <div className="flex justify-between rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <span className="font-medium text-red-800 dark:text-red-400">Remaining Due</span>
                  <span className="font-bold text-red-800 dark:text-red-400">{formatCurrency(remaining)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:text-gray-300"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-2.5 font-medium text-white shadow-lg"
              >
                Complete Sale
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Print Invoice Modal */}
      {completedSale && (
        <InvoicePrintModal
          sale={completedSale}
          isOpen={showPrintModal}
          onClose={handleClosePrintModal}
        />
      )}
    </div>
  );
}
