import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../services/supabase";

export const StoreContext = createContext(null);

// Bumped to v3 so all browsers immediately load the new .webp image URLs!
const CACHE_KEY = "sophea_mart_supabase_products_v3";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes fresh cache

function readCachedProducts() {
  try {
    // Clean up old legacy cache keys
    sessionStorage.removeItem("sophea_mart_products_cache");
    sessionStorage.removeItem("sophea_mart_supabase_products_v2");
    localStorage.removeItem("sophea_mart_supabase_products_v2");

    const raw =
      localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
    if (!raw) return { data: [], isFresh: false };

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
      const isFresh = Date.now() - (parsed.timestamp || 0) < CACHE_TTL;
      return { data: parsed.data, isFresh };
    }
  } catch {
    // Ignore storage errors (e.g., private browsing mode)
  }
  return { data: [], isFresh: false };
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => readCachedProducts().data);
  const [loading, setLoading] = useState(() => products.length === 0);
  const [error, setError] = useState(null);

  const [orders, setOrders] = useState([]);

  // Helper to update state AND browser cache together
  const updateProductsAndCache = useCallback((updater) => {
    setProducts((prev) => {
      const nextProducts =
        typeof updater === "function" ? updater(prev) : updater;
      try {
        if (Array.isArray(nextProducts) && nextProducts.length > 0) {
          const payload = JSON.stringify({
            data: nextProducts,
            timestamp: Date.now(),
          });
          localStorage.setItem(CACHE_KEY, payload);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      } catch {
        // Ignore storage quota errors
      }
      return nextProducts;
    });
  }, []);

  // --- FETCH REAL PRODUCTS FROM SUPABASE ---
  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      try {
        const cached = readCachedProducts();
        if (!forceRefresh && cached.isFresh && cached.data.length > 0) {
          setLoading(false);
          return;
        }

        // Only show full loading spinner if we don't already have cached products on screen
        if (cached.data.length === 0) {
          setLoading(true);
        }
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

  const refreshProducts = useCallback(() => {
    return fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts(false);

    // Automatically refresh storefront cache if Admin updates products in the same browser
    const handleAdminProductChange = () => fetchProducts(true);
    window.addEventListener("admin-products-changed", handleAdminProductChange);
    return () =>
      window.removeEventListener(
        "admin-products-changed",
        handleAdminProductChange,
      );
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
        return { data: null, error: err };
      }
    },
    [updateProductsAndCache],
  );

  // --- EDIT PRODUCT IN SUPABASE ---
  const editProduct = useCallback(
    async (id, updatedFields) => {
      try {
        const { data, error: sbError } = await supabase
          .from("products")
          .update(updatedFields)
          .eq("id", id)
          .select()
          .single();

        if (sbError) throw sbError;

        updateProductsAndCache((prev) => {
          if (data?.in_stock === false) {
            return prev.filter((p) => p.id !== id);
          }
          const exists = prev.some((p) => p.id === id);
          if (!exists && data?.in_stock) {
            return [...prev, data].sort((a, b) => a.id - b.id);
          }
          return prev.map((p) => (p.id === id ? { ...p, ...data } : p));
        });
        return { success: true, error: null };
      } catch (err) {
        console.error("Error updating product:", err.message);
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
      refreshProducts,
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
      refreshProducts,
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
