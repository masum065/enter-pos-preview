import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./authStore";
import { useActivityLogStore } from "./activityLogStore";

export type ProductCategory = "Laptop" | "Mobile" | "Tablet" | "Accessories" | "Parts" | "Other";

export interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: ProductCategory;
  description?: string;
  specifications?: string;
  defaultSalePrice: number;
  warranty?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductState {
  products: Product[];
  categories: ProductCategory[];
  isLoading: boolean;

  // Actions
  addProduct: (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => Product;
  updateProduct: (id: string, data: Partial<Product>) => boolean;
  deleteProduct: (id: string) => boolean;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: ProductCategory) => Product[];
  searchProducts: (query: string) => Product[];
  getTotalProducts: () => number;
}

const generateId = () => `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_CATEGORIES: ProductCategory[] = [
  "Laptop",
  "Mobile",
  "Tablet",
  "Accessories",
  "Parts",
  "Other",
];

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: DEFAULT_CATEGORIES,
      isLoading: false,

      addProduct: (data) => {
        const now = new Date().toISOString();
        const newProduct: Product = {
          ...data,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          products: [newProduct, ...state.products],
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE", // Adding a product is a stock related update
          entityId: newProduct.id,
          details: `Added new product: ${newProduct.brand} ${newProduct.modelName}`,
          after: newProduct
        });

        return newProduct;
      },

      updateProduct: (id, data) => {
        const state = get();
        const index = state.products.findIndex((p) => p.id === id);
        
        if (index === -1) return false;

        const oldProduct = state.products[index];
        const isPriceChange = data.defaultSalePrice !== undefined && data.defaultSalePrice !== oldProduct.defaultSalePrice;

        const updatedProduct = {
          ...oldProduct,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        
        if (isPriceChange) {
          useActivityLogStore.getState().addLog({
            userId: currentUser?.id || "system",
            userName: currentUser?.name || "System",
            userRole: currentUser?.role,
            action: "PRICE_CHANGE",
            entityId: id,
            details: `Price changed for ${oldProduct.brand} ${oldProduct.modelName}: ${oldProduct.defaultSalePrice} -> ${data.defaultSalePrice}`,
            before: { price: oldProduct.defaultSalePrice },
            after: { price: data.defaultSalePrice }
          });
        } else {
          useActivityLogStore.getState().addLog({
            userId: currentUser?.id || "system",
            userName: currentUser?.name || "System",
            userRole: currentUser?.role,
            action: "STOCK_UPDATE",
            entityId: id,
            details: `Updated product details for ${oldProduct.brand} ${oldProduct.modelName}`,
            before: oldProduct,
            after: updatedProduct
          });
        }

        return true;
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);
        
        if (!product) return false;

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));

        // Logging
        const currentUser = useAuthStore.getState().currentUser;
        useActivityLogStore.getState().addLog({
          userId: currentUser?.id || "system",
          userName: currentUser?.name || "System",
          userRole: currentUser?.role,
          action: "STOCK_UPDATE",
          entityId: id,
          details: `Deleted product: ${product.brand} ${product.modelName}`,
          before: product
        });

        return true;
      },

      getProductById: (id) => {
        return get().products.find((p) => p.id === id);
      },

      getProductsByCategory: (category) => {
        return get().products.filter((p) => p.category === category);
      },

      searchProducts: (query) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return get().products;

        return get().products.filter(
          (p) =>
            p.modelName.toLowerCase().includes(lowerQuery) ||
            p.brand.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery)
        );
      },

      getTotalProducts: () => get().products.length,
    }),
    {
      name: "enter-pos-products",
    }
  )
);
