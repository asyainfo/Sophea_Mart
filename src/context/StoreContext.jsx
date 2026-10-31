import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../services/supabase";

export const StoreContext = createContext(null);

const CACHE_KEY = "sophea_mart_products_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => {
    // 1. Load instantly from sessionStorage on refresh (0ms load, 0 Supabase bandwidth!)
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Date.now() - parsed.timestamp < CACHE_TTL &&
          Array.isArray(parsed.data)
        ) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    return [];
  });

  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState(null);

  const [orders, setOrders] = useState([
    {
      id: "ORD-001",
      userId: 1,
      total: 12.5,
      status: "completed",
      items: 3,
      date: "2025-05-28",
    },
    {
      id: "ORD-002",
      userId: 1,
      total: 8.75,
      status: "pending",
      items: 2,
      date: "2025-05-30",
    },
  ]);

  // Helper to update state AND sessionStorage cache together
  const updateProductsAndCache = useCallback((updater) => {
    setProducts((prev) => {
      const nextProducts =
        typeof updater === "function" ? updater(prev) : updater;
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: nextProducts, timestamp: Date.now() }),
        );
      } catch (e) {
        // Ignore storage quota errors
      }
      return nextProducts;
    });
  }, []);

  // --- FETCH PRODUCTS FROM SUPABASE ---
  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      try {
        // Skip network call if cache is still fresh and not forced
        if (!forceRefresh) {
          const saved = sessionStorage.getItem(CACHE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (
              Date.now() - parsed.timestamp < CACHE_TTL &&
              parsed.data?.length > 0
            ) {
              setLoading(false);
              return;
            }
          }
        }

        setLoading(true);
        setError(null);

        const { data, error: sbError } = await supabase
          .from("products")
          .select("*")
          .eq("in_stock", true)
          .order("id", { ascending: true });

        if (sbError) throw sbError;

        updateProductsAndCache(data || []);
      } catch (err) {
        console.error("Error fetching products:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [updateProductsAndCache],
  );

  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  // --- ADD PRODUCT TO SUPABASE ---
  const addProduct = useCallback(
    async (p) => {
      try {
        const { data, error: sbError } = await supabase
          .from("products")
          .insert([p])
          .select()
          .single();

        if (sbError) throw sbError;

        if (data && data.in_stock !== false) {
          updateProductsAndCache((prev) => [...prev, data]);
        }
        return { data, error: null };
      } catch (err) {
        console.error("Error adding product:", err.message);
        alert("Failed to add product.");
        return { data: null, error: err };
      }
    },
    [updateProductsAndCache],
  );

  // --- EDIT PRODUCT IN SUPABASE ---
  const editProduct = useCallback(
    async (id, updatedFields) => {
      try {
        const { error: sbError } = await supabase
          .from("products")
          .update(updatedFields)
          .eq("id", id);

        if (sbError) throw sbError;

        updateProductsAndCache((prev) => {
          // If product was marked out of stock, remove it from public storefront list
          if (updatedFields.in_stock === false) {
            return prev.filter((p) => p.id !== id);
          }
          return prev.map((p) =>
            p.id === id ? { ...p, ...updatedFields } : p,
          );
        });
        return { success: true, error: null };
      } catch (err) {
        console.error("Error updating product:", err.message);
        alert("Failed to update product.");
        return { success: false, error: err };
      }
    },
    [updateProductsAndCache],
  );

  // --- DELETE PRODUCT IN SUPABASE ---
  const deleteProduct = useCallback(
    async (id) => {
      try {
        const { error: sbError } = await supabase
          .from("products")
          .delete()
          .eq("id", id);

        if (sbError) throw sbError;

        updateProductsAndCache((prev) => prev.filter((p) => p.id !== id));
        return { success: true, error: null };
      } catch (err) {
        console.error("Error deleting product:", err.message);
        alert("Failed to delete product.");
        return { success: false, error: err };
      }
    },
    [updateProductsAndCache],
  );

  const addOrder = useCallback((order) => {
    setOrders((prev) => [...prev, order]);
  }, []);

  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
    [orders],
  );

  const contextValue = useMemo(
    () => ({
      products,
      loading,
      error,
      refreshProducts: () => fetchProducts(true),
      addProduct,
      editProduct,
      deleteProduct,
      orders,
      addOrder,
      totalRevenue,
    }),
    [
      products,
      loading,
      error,
      fetchProducts,
      addProduct,
      editProduct,
      deleteProduct,
      orders,
      addOrder,
      totalRevenue,
    ],
  );

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}
