"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStockItems, useUpdateStockStatus } from "@/hooks/useStock";
import { useProducts } from "@/hooks/useProducts";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: string;
  defaultSalePrice: string;
  description: string | null;
  [key: string]: any;
}

interface StockItem {
  id: string;
  serialNumber: string;
  imei: string | null;
  productId: string;
  purchasePrice: string;
  supplierName: string | null;
  purchaseSource: string;
  purchaseDate: string;
  status: string;
  soldAt: string | null;
  sellerId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

type StockStatus = "Available" | "Sold" | "Service" | "Returned" | "Damaged";

// Searchable Product Select Component
function ProductSearchSelect({
  products,
  selectedProductId,
  onSelect,
}: {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Filtered products (max 5)
  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products.slice(0, 5);
    const q = query.toLowerCase();
    return products
      .filter((p) => 
        p.modelName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        `${p.brand} ${p.modelName}`.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, query]);

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

  const handleSelectProduct = (product: Product) => {
    onSelect(product.id);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect("All");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative min-w-[200px]">
      {selectedProductId !== "All" && selectedProduct ? (
        // Selected Product Display
        <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-800 dark:text-blue-300">
              {selectedProduct.brand}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedProduct.modelName}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="ml-2 rounded-full p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-600 dark:hover:bg-blue-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Search Input
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            placeholder="Filter by product..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && selectedProductId === "All" && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {/* All Products Option */}
          <button
            onClick={() => {
              onSelect("All");
              setQuery("");
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            All Products
          </button>
          
          <div className="border-t border-gray-100 dark:border-gray-700"></div>

          {filteredProducts.length === 0 ? (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              No products found
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {product.brand.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {product.brand} {product.modelName}
                  </p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                </div>
              </button>
            ))
          )}
          
          {filteredProducts.length > 0 && products.length > 5 && !query && (
            <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-700">
              Type to search {products.length} products...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Seller Display Component
function SellerDisplay({ sellerId }: { sellerId: string }) {
  return <p className="text-sm font-medium text-gray-900 dark:text-white">Seller</p>;
}

// Status filter tabs
const STATUS_OPTIONS: (StockStatus | "All")[] = ["All", "Available", "Sold", "Service", "Returned", "Damaged"];
const STOCK_STATUS_OPTIONS: StockStatus[] = ["Available", "Sold", "Service", "Returned", "Damaged"];

function StockPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";
  const activeStatus = searchParams.get("status") || "";
  const activeSource = searchParams.get("source") || "";
  const activeProductId = searchParams.get("productId") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  const { data: stockData, isLoading } = useStockItems({
    page, limit: 20,
    search: activeSearch || undefined,
    status: activeStatus || undefined,
    source: activeSource || undefined,
    productId: activeProductId || undefined,
  });
  const { data: productsData } = useProducts({ limit: 500 });
  const updateStockMutation = useUpdateStockStatus();

  const stockItems: StockItem[] = (stockData?.stockItems || []).map((s: any) => s.stockItem || s);
  const products: Product[] = (productsData?.products || []) as any[];
  const pagination = (stockData as any)?.pagination;
  const statusCounts: Record<string, number> = (stockData as any)?.statusCounts || {};

  // URL-based search
  const [searchInput, setSearchInput] = useState(activeSearch);
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = searchInput.trim();
    if (query) {
      params.set("search", query);
      params.delete("page");
    } else {
      params.delete("search");
    }
    router.push(`?${params.toString()}`);
  };
  const clearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // URL-based status filter
  const setStatus = (s: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (s === "All" || s === "") {
      params.delete("status");
    } else {
      params.set("status", s);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // URL-based source filter
  const setSource = (src: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (src === "All" || src === "") {
      params.delete("source");
    } else {
      params.set("source", src);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // URL-based product filter
  const setProductFilter = (pid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pid === "All" || pid === "") {
      params.delete("productId");
    } else {
      params.set("productId", pid);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
  const [viewingStockItem, setViewingStockItem] = useState<StockItem | null>(null);

  // Get product name by ID
  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product ? `${product.brand} ${product.modelName}` : "Unknown Product";
  };

  // Stats from API (all data, not just current page)
  const apiStats = (stockData as any)?.stats;
  const stats = {
    total: apiStats?.total || stockItems.length,
    available: apiStats?.available || stockItems.filter(s => s.status === "Available").length,
    sold: apiStats?.sold || stockItems.filter(s => s.status === "Sold").length,
    stockValue: apiStats?.stockValue || 0,
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

        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-100">Stock Value</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(stats.stockValue)}</p>
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
              onClick={() => setStatus(status === "All" ? "" : status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                (status === "All" && !activeStatus) || activeStatus === status
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {status} {statusCounts[status] !== undefined ? `(${statusCounts[status]})` : ''}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex flex-wrap gap-2">
          <select
            value={activeSource || "All"}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="All">All Sources</option>
            <option value="supplier">Supplier</option>
            <option value="local">Local Purchase</option>
          </select>
        </div>

        <div className="flex flex-1 gap-4">
          {/* Product Filter */}
          <ProductSearchSelect
            products={products}
            selectedProductId={activeProductId || "All"}
            onSelect={(pid) => setProductFilter(pid)}
          />

          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by serial, IMEI..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
              {activeSearch && (
                <button type="button" onClick={clearSearch} className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
              )}
              <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Search</button>
            </div>
          </form>
        </div>
      </div>

      {/* Active Filters Info */}
      {(activeSearch || activeStatus || activeSource || activeProductId) && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Found {pagination?.total || stockItems.length} items
          {activeSearch ? ` matching "${activeSearch}"` : ''}
          {activeStatus ? ` — Status: ${activeStatus}` : ''}
          {activeSource ? ` — Source: ${activeSource}` : ''}
        </div>
      )}

      {/* Stock Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Serial Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Product</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Purchase Price</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">Source / Seller</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {activeSearch || activeStatus || activeSource || activeProductId ? "No stock items found matching filters." : "No stock items yet."}
                  </td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setViewingStockItem(item)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
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
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(parseFloat(item.purchasePrice))}</p>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      {item.purchaseSource === "local" ? (
                        <div>
                          <span className="mb-1 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Local Purchase
                          </span>
                          {item.sellerId && (
                            <SellerDisplay sellerId={item.sellerId} />
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="mb-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Supplier
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.supplierName || "Unknown"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          onClick={() => setViewingStockItem(item)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          title="View Details"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Edit Button */}
                        {item.status !== "Sold" && (
                          <button
                            onClick={() => setEditingStockItem(item)}
                            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Edit Modal */}
      {editingStockItem && (
        <Modal isOpen={true} onClose={() => setEditingStockItem(null)} title="Edit Stock Item" size="md">
          <StockEditForm
            stockItem={editingStockItem}
            productName={getProductName(editingStockItem.productId)}
            onClose={() => setEditingStockItem(null)}
            onSave={async (data) => {
              try {
                await apiClient.put(`/api/stock/${editingStockItem.id}`, data);
              } catch (e) { console.error(e); }
              setEditingStockItem(null);
            }}
          />
        </Modal>
      )}

      {/* Stock Detail Modal */}
      {viewingStockItem && (
        <StockDetailModal
          stockItem={viewingStockItem}
          product={products.find(p => p.id === viewingStockItem.productId)}
          onClose={() => setViewingStockItem(null)}
          onEdit={() => {
            if (viewingStockItem.status !== "Sold") {
              setEditingStockItem(viewingStockItem);
              setViewingStockItem(null);
            }
          }}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// Stock Detail Modal Component
function StockDetailModal({
  stockItem,
  product,
  onClose,
  onEdit,
}: {
  stockItem: StockItem;
  product?: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isSold = stockItem.status === "Sold";

  return (
    <Modal isOpen={true} onClose={onClose} title="Stock Item Details" size="lg">
      <div className="space-y-6 text-left">
        {/* Product Header */}
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-800 dark:text-blue-300">
              {product?.brand.charAt(0) || "?"}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{product?.brand || "Unknown"}</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{product?.modelName || "Unknown Product"}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{product?.category}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(stockItem.status)}`}>
                {stockItem.status}
              </span>
            </div>
          </div>
        </div>

        {/* Serial & IMEI */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Serial Number</p>
            <p className="mt-1 font-mono text-lg font-medium text-gray-900 dark:text-white">{stockItem.serialNumber}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">IMEI</p>
            <p className="mt-1 font-mono text-lg font-medium text-gray-900 dark:text-white">{stockItem.imei || "-"}</p>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-300">Purchase Price</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(parseFloat(stockItem.purchasePrice))}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stockItem.purchaseSource === "local" ? "Seller" : "Supplier"}
            </p>
            {stockItem.purchaseSource === "local" && stockItem.sellerId ? (
              <SellerDisplay sellerId={stockItem.sellerId} />
            ) : (
              <p className="mt-1 font-medium text-gray-900 dark:text-white">{stockItem.supplierName || "Not specified"}</p>
            )}
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(stockItem.purchaseDate)}</p>
          </div>
        </div>

        {/* Sale Price Reference */}
        {product && (
          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Default Sale Price</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(parseFloat(product.defaultSalePrice))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700 dark:text-blue-300">Estimated Profit</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(parseFloat(product.defaultSalePrice) - parseFloat(stockItem.purchasePrice))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sold Info */}
        {isSold && stockItem.soldAt && (
          <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">Sold On</p>
            <p className="mt-1 font-medium text-red-600 dark:text-red-400">{formatDate(stockItem.soldAt)}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <p className="mb-2 text-sm font-medium text-gray-500">Timeline</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Added to inventory</span>
              <span className="text-gray-900 dark:text-white">{formatDate(stockItem.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last updated</span>
              <span className="text-gray-900 dark:text-white">{formatDate(stockItem.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {!isSold && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Item
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}


// Stock Edit Form Component
function StockEditForm({
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
  const [status, setStatus] = useState<StockStatus>(stockItem.status as StockStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSold) return; // Prevent submitting sold items
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
          <span className="text-sm font-medium">This item has been sold. Editing is disabled to protect sales records.</span>
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
          onChange={(e) => setPurchasePrice(e.target.value as any)}
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
  );
}


export default function StockPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>}>
      <StockPageContent />
    </Suspense>
  );
}
