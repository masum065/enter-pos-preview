"use client";

import { useState, useEffect, useMemo } from "react";
import { useStockStore, StockItem, StockStatus } from "@/stores/stockStore";
import { useProductStore, Product } from "@/stores/productStore";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { generateMockProducts, generateMockStock } from "@/lib/mockData";
import Link from "next/link";

// Status filter tabs
const STATUS_OPTIONS: (StockStatus | "All")[] = ["All", "Available", "Sold", "Service", "Returned", "Damaged"];

export default function StockPage() {
  const { stockItems, getAvailableStockCount, getSoldStockCount, getTotalStockValue } = useStockStore();
  const { products, addProduct } = useProductStore();
  const stockStore = useStockStore();
  const productStore = useProductStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | "All">("All");
  const [selectedProduct, setSelectedProduct] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize mock data
  useEffect(() => {
    let loadedProducts = products;
    
    if (products.length === 0) {
      const mockProducts = generateMockProducts();
      mockProducts.forEach((product) => {
        productStore.addProduct({
          modelName: product.modelName,
          brand: product.brand,
          category: product.category,
          description: product.description,
          specifications: product.specifications,
          defaultSalePrice: product.defaultSalePrice,
          warrantyMonths: product.warrantyMonths,
          imageUrl: product.imageUrl,
        });
      });
      loadedProducts = productStore.products;
    }

    if (stockItems.length === 0 && loadedProducts.length > 0) {
      const mockStock = generateMockStock(loadedProducts, 5);
      mockStock.forEach((item) => {
        try {
          stockStore.addStockItem({
            serialNumber: item.serialNumber,
            imei: item.imei,
            productId: item.productId,
            purchasePrice: item.purchasePrice,
            supplierName: item.supplierName,
            purchaseDate: item.purchaseDate,
            status: item.status,
            soldAt: item.soldAt,
          });
        } catch (e) {
          // Skip duplicates
        }
      });
    }
    setIsLoading(false);
  }, []);

  // Get product name by ID
  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product ? `${product.brand} ${product.modelName}` : "Unknown Product";
  };

  // Filtered stock items
  const filteredStock = useMemo(() => {
    let result = stockItems;
    
    // Filter by status
    if (selectedStatus !== "All") {
      result = result.filter((s) => s.status === selectedStatus);
    }
    
    // Filter by product
    if (selectedProduct !== "All") {
      result = result.filter((s) => s.productId === selectedProduct);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => 
        s.serialNumber.toLowerCase().includes(query) ||
        s.imei?.toLowerCase().includes(query) ||
        getProductName(s.productId).toLowerCase().includes(query) ||
        s.supplierName?.toLowerCase().includes(query)
      );
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [stockItems, selectedStatus, selectedProduct, searchQuery, products]);

  // Stats
  const stats = useMemo(() => ({
    total: stockItems.length,
    available: getAvailableStockCount(),
    sold: getSoldStockCount(),
    stockValue: getTotalStockValue(),
  }), [stockItems, getAvailableStockCount, getSoldStockCount, getTotalStockValue]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Inventory</h1>
          <p className="text-gray-600 dark:text-gray-400">Track all items with serial numbers</p>
        </div>
        <Link
          href="/inventory/stock/add"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Stock
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Total Items</p>
              <p className="mt-1 text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Available</p>
              <p className="mt-1 text-3xl font-bold">{stats.available}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-100">Sold</p>
              <p className="mt-1 text-3xl font-bold">{stats.sold}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Stock Value</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.stockValue)}</p>
            </div>
            <div className="rounded-lg bg-white/20 p-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedStatus === status
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-1 gap-4">
          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="All">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.brand} {product.modelName}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by serial number..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Serial Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Product</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Purchase Price</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">Supplier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No stock items found.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">{item.serialNumber}</p>
                        {item.imei && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">IMEI: {item.imei}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{getProductName(item.productId)}</p>
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</p>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      <p className="text-gray-600 dark:text-gray-400">{item.supplierName || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination placeholder */}
      {filteredStock.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>Showing {filteredStock.length} of {stockItems.length} items</p>
        </div>
      )}
    </div>
  );
}
