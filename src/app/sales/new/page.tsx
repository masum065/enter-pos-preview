"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSalesStore, SaleItem, PaymentMethod, calculateSaleItem, calculateSaleTotals } from "@/stores/salesStore";
import { useCustomerStore, Customer } from "@/stores/customerStore";
import { useProductStore } from "@/stores/productStore";
import { useStockStore, StockItem } from "@/stores/stockStore";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type Step = 1 | 2 | 3;

export default function NewSalePage() {
  const router = useRouter();
  const salesStore = useSalesStore();
  const customerStore = useCustomerStore();
  const productStore = useProductStore();
  const stockStore = useStockStore();

  const [step, setStep] = useState<Step>(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Step 1: Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

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

  // Search customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerStore.customers.slice(0, 5);
    return customerStore.searchCustomers(customerSearch).slice(0, 10);
  }, [customerSearch, customerStore]);

  // Get product name for display
  const getProductName = (productId: string) => {
    const product = productStore.products.find((p) => p.id === productId);
    return product ? `${product.brand} ${product.modelName}` : "Unknown";
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

    // Validate sale price >= purchase price
    const salePrice = product.defaultSalePrice;
    if (salePrice < stockItem.purchasePrice) {
      setSerialError("Sale price cannot be less than purchase price");
      return;
    }

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
    setSaleItems(saleItems.map((item) => {
      if (item.id !== itemId) return item;
      
      if (newPrice < item.purchasePrice) {
        return item; // Don't allow price below purchase
      }

      const { amount, profit } = calculateSaleItem(newPrice, item.purchasePrice, item.discount);
      return { ...item, salePrice: newPrice, amount, profit };
    }));
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
                step >= s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              }`}
            >
              {s}
            </div>
            <span className={`hidden sm:block ${step >= s ? "font-medium text-gray-900 dark:text-white" : "text-gray-500"}`}>
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
            
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  </button>
                ))}
              </div>
            )}

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
              <button
                onClick={handleAddBySerial}
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white"
              >
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
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
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
              <button onClick={() => setStep(1)} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:text-gray-300">
                Back
              </button>
              <button
                onClick={() => { setPaymentAmount(totals.grandTotal); setStep(3); }}
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
                    <button onClick={() => handleRemovePayment(i)} className="text-red-500">✕</button>
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
                  <button
                    onClick={handleAddPayment}
                    className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white"
                  >
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
              <button onClick={() => setStep(2)} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:text-gray-300">
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
    </div>
  );
}
