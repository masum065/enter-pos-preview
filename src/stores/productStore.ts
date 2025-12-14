import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProductCategory = "Laptop" | "Mobile" | "Tablet" | "Accessories" | "Parts" | "Other";

export interface Product {
  id: string;
  modelName: string;
  brand: string;
  category: ProductCategory;
  description?: string;
  specifications?: string;
  defaultSalePrice: number;
  warrantyMonths?: number;
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

        return newProduct;
      },

      updateProduct: (id, data) => {
        const state = get();
        const index = state.products.findIndex((p) => p.id === id);
        
        if (index === -1) return false;

        const updatedProduct = {
          ...state.products[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        }));

        return true;
      },

      deleteProduct: (id) => {
        const state = get();
        const exists = state.products.some((p) => p.id === id);
        
        if (!exists) return false;

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));

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
