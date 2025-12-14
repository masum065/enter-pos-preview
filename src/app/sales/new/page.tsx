"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSalesStore, SaleItem, PaymentMethod, calculateSaleItem, calculateSaleTotals } from "@/stores/salesStore";
import { useCustomerStore, Customer } from "@/stores/customerStore";
import { useProductStore } from "@/stores/productStore";
import { useStockStore } from "@/stores/stockStore";
import { formatCurrency, isValidBDPhone } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";

type Step = 1 | 2 | 3;

// Add Customer Modal Component
function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: Customer) => void;
}) {
  const { addCustomer } = useCustomerStore();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!isValidBDPhone(formData.phone)) {
      newErrors.phone = "Invalid BD phone number (01XXXXXXXXX)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const newCustomer = addCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      nid: formData.nid.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });

    // Reset form
    setFormData({ name: "", phone: "", email: "", address: "", nid: "", notes: "" });
    setErrors({});

    // Notify parent with new customer
    onCustomerAdded(newCustomer);
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: "", phone: "", email: "", address: "", nid: "", notes: "" });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Customer" size="md">
      <div className="space-y-4 text-left">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
              errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-700"
            }`}
            placeholder="Customer name"
            autoFocus
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

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

        {/* Email & Address Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              NID
            </label>
            <input
              type="text"
              value={formData.nid}
              onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="National ID"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Customer address"
          />
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Add Customer"
      />
    </Modal>
  );
}

// Customer Combobox Component
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

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 8);
    return searchCustomers(query).slice(0, 10);
  }, [query, customers, searchCustomers]);

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

  // Show no results message when query has no matching customers
  const showNoResults = query.trim() && filteredCustomers.length === 0;

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
              placeholder="Search customer by name or phone..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Dropdown */}
          {isOpen && (
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

              {/* Always show Add New at bottom if has results */}
              {!showNoResults && (
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
  const [serialInput, setSerialInput] = useState("");
  const [serialError, setSerialError] = useState("");

  // Step 3: Payment
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [notes, setNotes] = useState("");

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

  // Add item by serial number
  const handleAddBySerial = () => {
    setSerialError("");
    const serial = serialInput.trim().toUpperCase();

    if (!serial) {
      setSerialError("Enter a serial number");
      return;
    }

    // Check if already added
    if (saleItems.some((item) => item.serialNumber === serial)) {
      setSerialError("This item is already added");
      return;
    }

    // Find stock item
    const stockItem = stockStore.getStockBySerial(serial);
    if (!stockItem) {
      setSerialError("Serial number not found");
      return;
    }

    if (stockItem.status !== "Available") {
      setSerialError(`This item is ${stockItem.status.toLowerCase()}`);
      return;
    }

    // Find product
    const product = productStore.products.find((p) => p.id === stockItem.productId);
    if (!product) {
      setSerialError("Product not found");
      return;
    }

    const salePrice = product.defaultSalePrice;
    const { amount, profit } = calculateSaleItem(salePrice, stockItem.purchasePrice, 0);

    const newItem: SaleItem = {
      id: `item_${Date.now()}`,
      productId: product.id,
      stockItemId: stockItem.id,
      serialNumber: serial,
      productName: `${product.brand} ${product.modelName}`,
      quantity: 1,
      salePrice,
      purchasePrice: stockItem.purchasePrice,
      discount: 0,
      amount,
      profit,
    };

    setSaleItems([...saleItems, newItem]);
    setSerialInput("");
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

        if (newPrice < item.purchasePrice) {
          return item; // Don't allow price below purchase
        }

        const { amount, profit } = calculateSaleItem(newPrice, item.purchasePrice, item.discount);
        return { ...item, salePrice: newPrice, amount, profit };
      })
    );
  };

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

    // Redirect to sales list
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

            {/* Serial Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBySerial()}
                  placeholder="Enter serial number..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                {serialError && <p className="mt-1 text-sm text-red-500">{serialError}</p>}
              </div>
              <button onClick={handleAddBySerial} className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white">
                Add
              </button>
            </div>

            {/* Items List */}
            {saleItems.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <p className="text-gray-500">No items added yet. Enter a serial number above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saleItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="font-mono text-sm text-gray-500">{item.serialNumber}</p>
                    </div>
                    <div className="text-right">
                      <input
                        type="number"
                        value={item.salePrice}
                        onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                        className="w-32 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        min={item.purchasePrice}
                      />
                      <p className="mt-1 text-xs text-green-600">Profit: {formatCurrency(item.profit)}</p>
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </div>
                ))}
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
                disabled={saleItems.length === 0}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white disabled:opacity-50"
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
    </div>
  );
}
