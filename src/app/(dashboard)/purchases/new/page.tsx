"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProductStore } from "@/stores/productStore";
import { useStockStore } from "@/stores/stockStore";
import { usePurchaseStore } from "@/stores/purchaseStore";
import { useCustomerStore } from "@/stores/customerStore";
import { PaymentMethod } from "@/stores/salesStore";
import Link from "next/link";

export default function PurchaseProductPage() {
  const router = useRouter();
  const { products } = useProductStore();
  const { addStockItem, checkDuplicateSerial } = useStockStore();
  const { addPurchase } = usePurchaseStore();
  const { customers, searchCustomers } = useCustomerStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [sellerSearch, setSellerSearch] = useState("");
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredSellers = sellerSearch.length >= 2
    ? searchCustomers(sellerSearch)
    : sellerSearch.length > 0 ? [] : customers.slice(0, 10);

  const filteredProducts = productSearch.length >= 2
    ? products.filter((p) =>
        p.modelName.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
        `${p.brand} ${p.modelName}`.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 10)
    : productSearch.length > 0 ? [] : products.slice(0, 10);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedSeller) newErrors.seller = "Please select a seller";
    if (!selectedProduct) newErrors.product = "Please select a product";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (checkDuplicateSerial(formData.serialNumber.trim())) {
      newErrors.serialNumber = "This serial number already exists";
    }
    if (formData.purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be greater than 0";
    if (formData.paidAmount < 0) newErrors.paidAmount = "Paid amount cannot be negative";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const product = selectedProduct;
      if (!product) return;

      // Create stock item
      const stockItem = addStockItem({
        serialNumber: formData.serialNumber.trim(),
        imei: formData.imei.trim() || undefined,
        productId: selectedProduct.id,
        purchasePrice: formData.purchasePrice,
        purchaseSource: "local",
        sellerId: selectedSeller.id,
        purchaseDate: formData.purchaseDate,
        status: "Available",
        notes: formData.notes.trim() || undefined,
      });

      // Create purchase invoice
      const invoice = addPurchase({
        purchaseDate: formData.purchaseDate,
        sellerId: selectedSeller.id,
        sellerName: selectedSeller.name,
        sellerPhone: selectedSeller.phone,
        productId: product.id,
        productName: product.modelName,
        serialNumber: formData.serialNumber.trim(),
        imei: formData.imei.trim() || undefined,
        purchasePrice: formData.purchasePrice,
        paymentMethod: formData.paymentMethod,
        paidAmount: formData.paidAmount,
        notes: formData.notes.trim() || undefined,
        stockItemId: stockItem.id,
        createdBy: "admin",
      });

      setPurchaseInvoice(invoice);
    } catch (error) {
      console.error("Error creating purchase:", error);
    }
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
    setSellerSearch("");
    setProductSearch("");
    setErrors({});
    setPurchaseInvoice(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  // Show invoice after purchase
  if (purchaseInvoice) {
    const product = products.find((p) => p.id === purchaseInvoice.productId);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Invoice</h1>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
              Print Invoice
            </button>
            <button onClick={handleReset} className="rounded-lg bg-purple-600 px-4 py-2 text-white">
              New Purchase
            </button>
            <Link href="/inventory/stock" className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700">
              View Stock
            </Link>
          </div>
        </div>

        {/* Invoice */}
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-purple-600">PURCHASE INVOICE</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Invoice #: {purchaseInvoice.invoiceNumber}</p>
            <p className="text-sm text-gray-500">Date: {new Date(purchaseInvoice.purchaseDate).toLocaleDateString()}</p>
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
              <p className="text-gray-600 dark:text-gray-400">Amount Paid: ৳{purchaseInvoice.paidAmount.toLocaleString()}</p>
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
                  <td className="px-4 py-3 text-right font-semibold">৳{purchaseInvoice.purchasePrice.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between border-t-2 border-purple-600 pt-2">
                <span className="font-bold text-gray-900 dark:text-white">Total Amount:</span>
                <span className="text-xl font-bold text-purple-600">৳{purchaseInvoice.purchasePrice.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold text-green-600">৳{purchaseInvoice.paidAmount.toLocaleString()}</span>
              </div>
              {purchaseInvoice.paidAmount < purchaseInvoice.purchasePrice && (
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-semibold text-red-600">
                    ৳{(purchaseInvoice.purchasePrice - purchaseInvoice.paidAmount).toLocaleString()}
                  </span>
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

  // Purchase form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Product</h1>
        <p className="text-gray-600 dark:text-gray-400">Buy product from customer/seller</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Seller Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Seller (Customer) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {selectedSeller ? (
                <div className="flex items-center justify-between rounded-lg border-2 border-purple-500 bg-purple-50 p-4 dark:bg-purple-900/20">
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100">{selectedSeller.name}</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">{selectedSeller.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSeller(null)}
                    className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={sellerSearch}
                    onChange={(e) => {
                      setSellerSearch(e.target.value);
                      setShowSellerDropdown(true);
                    }}
                    onFocus={() => setShowSellerDropdown(true)}
                    placeholder="Search seller by name or phone..."
                    className={`w-full rounded-lg border px-4 py-3 dark:bg-gray-800 dark:text-white ${
                      errors.seller ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                    }`}
                  />
                  {showSellerDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      {filteredSellers.length > 0 ? (
                        filteredSellers.map((seller) => (
                          <button
                            key={seller.id}
                            type="button"
                            onClick={() => {
                              setSelectedSeller(seller);
                              setShowSellerDropdown(false);
                              setSellerSearch("");
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">{seller.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{seller.phone}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500">
                          No sellers found.{" "}
                          <Link href="/customers" className="text-purple-600 hover:underline">
                            Add new customer
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {errors.seller && <p className="mt-1 text-sm text-red-500">{errors.seller}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Product Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {selectedProduct ? (
                  <div className="flex items-center justify-between rounded-lg border-2 border-purple-500 bg-purple-50 p-4 dark:bg-purple-900/20">
                    <div>
                      <p className="font-semibold text-purple-900 dark:text-purple-100">
                        {selectedProduct.brand} {selectedProduct.modelName}
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">{selectedProduct.category}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search product by name or brand (min 2 chars)..."
                      className={`w-full rounded-lg border px-4 py-3 dark:bg-gray-800 dark:text-white ${
                        errors.product ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                      }`}
                    />
                    {showProductDropdown && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {productSearch.length > 0 && productSearch.length < 2 ? (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            Type at least 2 characters to search...
                          </div>
                        ) : filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowProductDropdown(false);
                                setProductSearch("");
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {product.brand} {product.modelName}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{product.category}</p>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500">
                            No products found.{" "}
                            <Link href="/inventory/products" className="text-purple-600 hover:underline">
                              Add new product
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {errors.product && <p className="mt-1 text-sm text-red-500">{errors.product}</p>}
            </div>

            {/* Serial Number */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
                  errors.serialNumber ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                }`}
                placeholder="Enter serial number"
              />
              {errors.serialNumber && <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>}
            </div>

            {/* IMEI */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                IMEI (Optional)
              </label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Enter IMEI (for mobiles)"
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
                  onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Method
              </label>
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
                />
              </div>
              {errors.paidAmount && <p className="mt-1 text-sm text-red-500">{errors.paidAmount}</p>}
            </div>

            {/* Purchase Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (Optional)
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
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Link
              href="/inventory/stock"
              className="rounded-lg border border-gray-300 px-6 py-3 text-center text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-medium text-white shadow-lg"
            >
              Complete Purchase
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
