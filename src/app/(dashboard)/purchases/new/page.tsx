"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchase } from "@/hooks/usePurchases";
import { CustomerCombobox } from "@/components/ui/customer-combobox";
import type { CustomerOption } from "@/components/ui/customer-combobox";
import { AddCustomerModal } from "@/components/customers/customer-modals";
import { PurchaseFormFields, PurchaseFormData, Seller, PaymentMethod } from "@/components/purchases/purchase-form";
import Link from "next/link";



export default function PurchaseProductPage() {
  const router = useRouter();
  const createPurchaseMutation = useCreatePurchase();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const [formData, setFormData] = useState<PurchaseFormData>({
    serialNumber: "",
    imei: "",
    purchasePrice: 0,
    paymentMethod: "Cash",
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
        <PurchaseFormFields
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          selectedSeller={selectedSeller}
          setSelectedSeller={setSelectedSeller}
          setCustomerSearchQuery={setCustomerSearchQuery}
          setShowAddCustomerModal={setShowAddCustomerModal}
          isPending={createPurchaseMutation.isPending}
        />

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
