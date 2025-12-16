"use client";

import { useState, useEffect, useMemo } from "react";
import { useProductStore, Product, ProductCategory } from "@/stores/productStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateMockProducts } from "@/lib/mockData";
import { Modal, ModalFooter } from "@/components/ui/modal";

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
    warrantyMonths: product?.warrantyMonths || 12,
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
            Warranty (Months)
          </label>
          <input
            type="number"
            value={formData.warrantyMonths}
            onChange={(e) => setFormData({ ...formData, warrantyMonths: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            min="0"
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | "All">("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
          warrantyMonths: product.warrantyMonths,
          imageUrl: product.imageUrl,
        });
      });
    }
    setIsLoading(false);
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = searchQuery.trim() ? searchProducts(searchQuery) : products;
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    return result;
  }, [products, searchQuery, selectedCategory, searchProducts]);

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
    setIsModalOpen(false);
  };

  const handleUpdateProduct = (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setEditingProduct(null);
      setIsModalOpen(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.brand} ${product.modelName}"?`)) {
      deleteProduct(product.id);
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
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
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

      {/* Search */}
      <div className="relative max-w-md">
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
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              {/* Category Badge */}
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryColors[product.category]}`}>
                {product.category}
              </span>

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
                  {product.warrantyMonths && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.warrantyMonths} months warranty
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                  className="rounded-lg bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="rounded-lg bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
      >
        <ProductForm
          product={editingProduct || undefined}
          categories={categories}
          onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
          onCancel={() => { setIsModalOpen(false); setEditingProduct(null); }}
        />
      </Modal>
    </div>
  );
}
