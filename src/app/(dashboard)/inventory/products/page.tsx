"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductStore, Product, ProductCategory } from "@/stores/productStore";
import { useStockStore, StockItem, StockStatus } from "@/stores/stockStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateMockProducts } from "@/lib/mockData";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";

// Stock Status Options
const STOCK_STATUS_OPTIONS: StockStatus[] = ["Available", "Sold", "Service", "Returned", "Damaged"];

// Product Form Component
function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
}: {
  product?: Product;
  categories: ProductCategory[];
  onSubmit: (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    modelName: product?.modelName || "",
    brand: product?.brand || "",
    category: product?.category || categories[0],
    description: product?.description || "",
    specifications: product?.specifications || "",
    defaultSalePrice: product?.defaultSalePrice || 0,
    warranty: product?.warranty || "12 Months Service Warranty",
    imageUrl: product?.imageUrl || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.modelName.trim()) newErrors.modelName = "Model name is required";
    if (!formData.brand.trim()) newErrors.brand = "Brand is required";
    if (formData.defaultSalePrice <= 0) newErrors.defaultSalePrice = "Price must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData as Omit<Product, "id" | "createdAt" | "updatedAt">);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Brand <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
              errors.brand ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
            }`}
            placeholder="Apple, Samsung, Lenovo..."
          />
          {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Model Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.modelName}
          onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
          className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
            errors.modelName ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
          }`}
          placeholder="MacBook Pro 14 M3, iPhone 15 Pro Max..."
        />
        {errors.modelName && <p className="mt-1 text-sm text-red-500">{errors.modelName}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="256GB, M3 Pro, Space Gray..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Sale Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
            <input
              type="number"
              value={formData.defaultSalePrice}
              onChange={(e) => setFormData({ ...formData, defaultSalePrice: Number(e.target.value) })}
              className={`w-full rounded-lg border py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                errors.defaultSalePrice ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500 dark:border-gray-700"
              }`}
              placeholder="0"
              min="0"
            />
          </div>
          {errors.defaultSalePrice && <p className="mt-1 text-sm text-red-500">{errors.defaultSalePrice}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Warranty Details
          </label>
          <input
            type="text"
            value={formData.warranty}
            onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="e.g. 1 Year Service Warranty"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Specifications
        </label>
        <textarea
          value={formData.specifications}
          onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Detailed specifications..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
        >
          {product ? "Update Product" : "Add Product"}
        </button>
      </div>
    </form>
  );
}

// Stock Edit Modal Component
function StockEditModal({
  stockItem,
  productName,
  onClose,
  onSave,
}: {
  stockItem: StockItem;
  productName: string;
  onClose: () => void;
  onSave: (data: Partial<StockItem>) => void;
}) {
  const [serialNumber, setSerialNumber] = useState(stockItem.serialNumber);
  const [imei, setImei] = useState(stockItem.imei || "");
  const [purchasePrice, setPurchasePrice] = useState(stockItem.purchasePrice);
  const [supplierName, setSupplierName] = useState(stockItem.supplierName || "");
  const [status, setStatus] = useState<StockStatus>(stockItem.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serialNumber,
      imei: imei || undefined,
      purchasePrice,
      supplierName: supplierName || undefined,
      status,
    });
  };

  const isSold = stockItem.status === "Sold";

  return (
    <Modal isOpen={true} onClose={onClose} title={isSold ? "Stock Item Details" : "Edit Stock Item"} size="md">
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Product Info */}
        <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Product</p>
          <p className="font-medium text-gray-900 dark:text-white">{productName}</p>
        </div>

        {isSold && (
          <div className="flex items-center gap-2 rounded-lg bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">This item has been sold. Editing is disabled.</span>
          </div>
        )}

        {/* Serial Number */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Serial Number {!isSold && "*"}
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 font-mono dark:border-gray-600 dark:text-white ${
              isSold ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-700" : "border-gray-300 dark:bg-gray-800"
            }`}
            disabled={isSold}
            required={!isSold}
          />
        </div>

        {/* IMEI */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            IMEI
          </label>
          <input
            type="text"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 font-mono dark:border-gray-600 dark:text-white ${
              isSold ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-700" : "border-gray-300 dark:bg-gray-800"
            }`}
            disabled={isSold}
            placeholder={isSold ? "" : "For mobile devices"}
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Purchase Price {!isSold && "*"}
          </label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            className={`w-full rounded-lg border px-4 py-2.5 dark:border-gray-600 dark:text-white ${
              isSold ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-700" : "border-gray-300 dark:bg-gray-800"
            }`}
            disabled={isSold}
            min={0}
            required={!isSold}
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Supplier
          </label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 dark:border-gray-600 dark:text-white ${
              isSold ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-700" : "border-gray-300 dark:bg-gray-800"
            }`}
            disabled={isSold}
          />
        </div>

        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StockStatus)}
            className={`w-full rounded-lg border px-4 py-2.5 dark:border-gray-600 dark:text-white ${
              isSold ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-700" : "border-gray-300 dark:bg-gray-800"
            }`}
            disabled={isSold}
          >
            {STOCK_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Sold At Info */}
        {isSold && stockItem.soldAt && (
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Sold on:</span> {formatDate(stockItem.soldAt)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-600 dark:text-gray-300"
          >
            {isSold ? "Close" : "Cancel"}
          </button>
          {!isSold && (
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}


// Product Detail Modal with Stock List and Filter Tabs
function ProductDetailModal({
  product,
  stockItems,
  onClose,
  onEdit,
}: {
  product: Product;
  stockItems: StockItem[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const { updateStockItem, deleteStockItem } = useStockStore();
  const [stockFilter, setStockFilter] = useState<"available" | "sold" | "all">("available");
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);

  const availableStock = stockItems.filter((s) => s.status === "Available");
  const soldStock = stockItems.filter((s) => s.status === "Sold");
  const serviceStock = stockItems.filter((s) => s.status === "Service");

  // Filtered stock based on selected tab
  const filteredStockItems = useMemo(() => {
    switch (stockFilter) {
      case "available":
        return stockItems.filter((s) => s.status === "Available");
      case "sold":
        return stockItems.filter((s) => s.status === "Sold");
      default:
        return stockItems;
    }
  }, [stockItems, stockFilter]);

  const statusColors: Record<string, string> = {
    Available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Sold: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    Service: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Returned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Damaged: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const handleSaveStock = (data: Partial<StockItem>) => {
    if (editingStockItem) {
      updateStockItem(editingStockItem.id, data);
      setEditingStockItem(null);
    }
  };

  const productName = `${product.brand} ${product.modelName}`;

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Product Details" size="lg">
        <div className="space-y-6 text-left">
          {/* Product Info */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{product.modelName}</h3>
                {product.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{product.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(product.defaultSalePrice)}
                </p>
                <p className="text-sm text-gray-500">{product.warranty}</p>
              </div>
            </div>
          </div>

          {/* Stock Summary - Clickable Stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setStockFilter("available")}
              className={`rounded-lg p-4 text-center transition-all ${
                stockFilter === "available"
                  ? "bg-green-100 ring-2 ring-green-500 dark:bg-green-900/30"
                  : "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
              }`}
            >
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableStock.length}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Available</p>
            </button>
            <button
              onClick={() => setStockFilter("sold")}
              className={`rounded-lg p-4 text-center transition-all ${
                stockFilter === "sold"
                  ? "bg-red-100 ring-2 ring-red-500 dark:bg-red-900/30"
                  : "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
              }`}
            >
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{soldStock.length}</p>
              <p className="text-sm text-red-700 dark:text-red-300">Sold</p>
            </button>
            <button
              onClick={() => setStockFilter("all")}
              className={`rounded-lg p-4 text-center transition-all ${
                stockFilter === "all"
                  ? "bg-gray-200 ring-2 ring-gray-500 dark:bg-gray-700"
                  : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              }`}
            >
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stockItems.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </button>
          </div>

          {/* Stock List with Filter */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {stockFilter === "available" ? "Available Stock" : stockFilter === "sold" ? "Sold Items" : "All Stock Items"}
                <span className="ml-2 text-sm font-normal text-gray-500">({filteredStockItems.length})</span>
              </h4>
              <Link
                href={`/inventory/stock/add?productId=${product.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Stock
              </Link>
            </div>
            
            {filteredStockItems.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">
                  {stockFilter === "available" 
                    ? "No available stock for this product" 
                    : stockFilter === "sold" 
                    ? "No sold items yet" 
                    : "No stock items for this product"}
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Serial</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Purchase Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm text-gray-900 dark:text-white">{item.serialNumber}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.purchaseDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(item.purchasePrice)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setEditingStockItem(item)}
                            className="rounded p-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                            title="Edit Stock Item"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Edit Product
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock Edit Modal */}
      {editingStockItem && (
        <StockEditModal
          stockItem={editingStockItem}
          productName={productName}
          onClose={() => setEditingStockItem(null)}
          onSave={handleSaveStock}
        />
      )}
    </>
  );
}


// Category badge colors
const categoryColors: Record<ProductCategory, string> = {
  Laptop: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Mobile: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Tablet: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Accessories: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Parts: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  Other: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
};

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, searchProducts } = useProductStore();
  const stockStore = useStockStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | "All">("All");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "latest">("latest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize mock data on first load if empty
  useEffect(() => {
    if (products.length === 0) {
      const mockProducts = generateMockProducts();
      mockProducts.forEach((product) => {
        addProduct({
          modelName: product.modelName,
          brand: product.brand,
          category: product.category,
          description: product.description,
          specifications: product.specifications,
          defaultSalePrice: product.defaultSalePrice,
          warranty: product.warranty,
          imageUrl: product.imageUrl,
        });
      });
    }
    setIsLoading(false);
  }, []);

  // Get stock count for each product (for sorting)
  const getStockCount = (productId: string) => {
    return stockStore.getAvailableStockByProduct(productId).length;
  };

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = searchQuery.trim() ? searchProducts(searchQuery) : products;
    
    // Category filter
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = `${a.brand} ${a.modelName}`.localeCompare(`${b.brand} ${b.modelName}`);
          break;
        case "price":
          comparison = a.defaultSalePrice - b.defaultSalePrice;
          break;
        case "stock":
          comparison = getStockCount(a.id) - getStockCount(b.id);
          break;
        case "latest":
        default:
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [products, searchQuery, selectedCategory, sortBy, sortOrder, searchProducts]);

  // Get all stock for a product
  const getProductStock = (productId: string) => {
    return stockStore.getStockByProductId(productId);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    categories.forEach((cat) => {
      counts[cat] = products.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [products, categories]);

  const handleAddProduct = (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    addProduct(data);
    setIsFormModalOpen(false);
  };

  const handleUpdateProduct = (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setEditingProduct(null);
      setIsFormModalOpen(false);
    }
  };

  const handleDeleteProduct = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent card click
    if (window.confirm(`Are you sure you want to delete "${product.brand} ${product.modelName}"?`)) {
      deleteProduct(product.id);
    }
  };

  const handleEditProduct = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent card click
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleEditFromDetail = () => {
    if (viewingProduct) {
      setEditingProduct(viewingProduct);
      setViewingProduct(null);
      setIsFormModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your product catalog ({products.length} products)</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setIsFormModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            selectedCategory === "All"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          All ({categoryCounts.All})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === cat
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {cat} ({categoryCounts[cat] || 0})
          </button>
        ))}
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-gray-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "latest", label: "Latest", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { key: "name", label: "Name", icon: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" },
              { key: "price", label: "Price", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { key: "stock", label: "Stock", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  if (sortBy === option.key) {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy(option.key as typeof sortBy);
                    setSortOrder(option.key === "latest" ? "desc" : "asc");
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  sortBy === option.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                </svg>
                {option.label}
                {sortBy === option.key && (
                  <svg className={`h-3 w-3 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {searchQuery || selectedCategory !== "All" ? "No products found." : "No products yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const stockCount = getStockCount(product.id);
            return (
              <div
                key={product.id}
                onClick={() => handleViewProduct(product)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600"
              >
                {/* Badges */}
                <div className="flex items-center justify-between">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryColors[product.category]}`}>
                    {product.category}
                  </span>
                  {/* Stock Count Badge */}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    stockCount === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : stockCount <= 3
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {stockCount}
                  </span>
                </div>

                {/* Product Info */}
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                  <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">{product.modelName}</h3>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{product.description}</p>
                  )}
                </div>

                {/* Price & Warranty */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(product.defaultSalePrice)}
                    </p>
                    {product.warranty && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {product.warranty}
                      </p>
                    )}
                  </div>
                </div>

                {/* Click indicator */}
                <div className="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-xs text-blue-600 dark:text-blue-400">Click for details →</span>
                </div>

                {/* Actions */}
                <div className="absolute right-3 top-12 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handleEditProduct(e, product)}
                    className="rounded-lg bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteProduct(e, product)}
                    className="rounded-lg bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
      >
        <ProductForm
          product={editingProduct || undefined}
          categories={categories}
          onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
          onCancel={() => { setIsFormModalOpen(false); setEditingProduct(null); }}
        />
      </Modal>

      {/* Product Detail Modal */}
      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          stockItems={getProductStock(viewingProduct.id)}
          onClose={() => setViewingProduct(null)}
          onEdit={handleEditFromDetail}
        />
      )}
    </div>
  );
}
