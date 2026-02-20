"use client";

import { useProducts, useCreateProduct } from "@/hooks/useProducts";
import { useStockItems, useLowStock } from "@/hooks/useStock";
import { useSession } from "@/hooks/useSession";
import { useState } from "react";

export default function APITestPage() {
  const [search, setSearch] = useState("");
  
  // Test hooks
  const { data: session } = useSession();
  const { data: productsData, isLoading: productsLoading } = useProducts({ search, limit: 10 });
  const { data: stockData, isLoading: stockLoading } = useStockItems({ limit: 10 });
  const { data: lowStockData } = useLowStock();
  const createProduct = useCreateProduct();

  const handleCreateTestProduct = () => {
    createProduct.mutate({
      modelName: "Test Product " + Date.now(),
      brand: "Test Brand",
      category: "Laptop",
      defaultSalePrice: "50000",
      description: "Test product created via API",
      isDeleted: false,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Phase 2 API Test Page</h1>

      {/* Session Info */}
      <div className="mb-8 rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-xl font-semibold mb-4">Session</h2>
        {session?.user ? (
          <div>
            <p><strong>User ID:</strong> {session.user.userId}</p>
            <p><strong>Name:</strong> {session.user.name}</p>
            <p><strong>Role:</strong> {session.user.role}</p>
          </div>
        ) : (
          <p>Not logged in</p>
        )}
      </div>

      {/* Products */}
      <div className="mb-8 rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Products</h2>
          <button
            onClick={handleCreateTestProduct}
            disabled={createProduct.isPending}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {createProduct.isPending ? "Creating..." : "Create Test Product"}
          </button>
        </div>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded border border-stroke px-4 py-2"
        />

        {productsLoading ? (
          <p>Loading products...</p>
        ) : productsData?.products ? (
          <div>
            <p className="mb-2">Found {productsData.products.length} products</p>
            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Model</th>
                    <th className="p-2 text-left">Brand</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.products.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="p-2">{product.modelName}</td>
                      <td className="p-2">{product.brand}</td>
                      <td className="p-2">{product.category}</td>
                      <td className="p-2">৳{product.defaultSalePrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p>No products found</p>
        )}
      </div>

      {/* Stock Items */}
      <div className="mb-8 rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-xl font-semibold mb-4">Stock Items</h2>
        {stockLoading ? (
          <p>Loading stock...</p>
        ) : stockData?.stockItems ? (
          <div>
            <p className="mb-2">Found {stockData.stockItems.length} stock items</p>
            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Serial</th>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.stockItems.map((item) => (
                    <tr key={item.stockItem.id} className="border-b">
                      <td className="p-2">{item.stockItem.serialNumber}</td>
                      <td className="p-2">{item.product?.modelName || "N/A"}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-1 text-xs ${
                          item.stockItem.status === "available" 
                            ? "bg-success/10 text-success" 
                            : "bg-danger/10 text-danger"
                        }`}>
                          {item.stockItem.status}
                        </span>
                      </td>
                      <td className="p-2">৳{item.stockItem.purchasePrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p>No stock items found</p>
        )}
      </div>

      {/* Low Stock */}
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
        {lowStockData?.lowStockProducts && lowStockData.lowStockProducts.length > 0 ? (
          <div>
            <p className="mb-2 text-danger">
              {lowStockData.lowStockProducts.length} products have low stock!
            </p>
            <ul className="list-disc pl-5">
              {lowStockData.lowStockProducts.map((item) => (
                <li key={item.product.id}>
                  {item.product.modelName} - Only {item.availableCount} available
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-success">All products have sufficient stock ✓</p>
        )}
      </div>
    </div>
  );
}
