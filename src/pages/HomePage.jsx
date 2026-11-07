import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { supabase } from "../services/supabase";
import { FiSearch } from "react-icons/fi";

import Hero from "../components/layout/Hero";
import ProductCard from "../components/product/ProductCard";
import LoginModal from "../components/auth/LoginModal";
import RegisterModal from "../components/auth/RegisterModal";
import ForgotPasswordModal from "../components/auth/ForgotPasswordModal";
import QuickViewModal from "../components/product/QuickViewModal";
import { useToast } from "../components/ui/Toast";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next";

const INITIAL_BATCH_SIZE = 36;

const styles = {
  page: {
    width: "100%",
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 0 16px",
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#111",
  },
  count: {
    fontSize: 14,
    fontWeight: 500,
    color: "#9ca3af",
    marginLeft: 8,
  },
  empty: {
    textAlign: "center",
    padding: "80px 0",
    color: "#9ca3af",
  },
};

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products = [] } = useStore();
  const { dispatch, cart } = useCart();
  const { show: toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const pendingFavsRef = useRef(new Set());
  const loadMoreRef = useRef(null);

  // 1. Background Performance: 200ms debounce so typing in search is smooth
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setVisibleCount(INITIAL_BATCH_SIZE);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset visible batch when switching categories
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [category]);

  // 2. Background Performance: Only fetch favorites when user.id actually changes
  const fetchFavorites = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);

      if (error) throw error;
      setFavoriteIds(new Set((data || []).map((fav) => fav.product_id)));
    } catch (error) {
      console.error("Error fetching favorites:", error.message);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchFavorites(user.id);
    } else {
      setFavoriteIds(new Set());
    }
  }, [user?.id, fetchFavorites]);

  // 3. Background Performance: Instant O(1) Cart Lookup Map
  const cartQuantityMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cart)) {
      for (const item of cart) {
        map.set(item.id, item.quantity || 0);
      }
    }
    return map;
  }, [cart]);

  // 4. Memoized Filtering (Supports Name, Description, and Barcode)
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;
      if (!categoryMatch) return false;
      if (!debouncedSearch) return true;

      const searchMatch =
        product.name?.toLowerCase().includes(debouncedSearch) ||
        product.description?.toLowerCase().includes(debouncedSearch) ||
        product.barcode?.toLowerCase().includes(debouncedSearch);
      return searchMatch;
    });
  }, [products, debouncedSearch, category]);

  // 5. Progressive DOM Rendering: Automatically load next batch as user scrolls
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || visibleCount >= filteredProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + INITIAL_BATCH_SIZE, filteredProducts.length),
          );
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredProducts.length]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const handleAddToCart = useCallback(
    (product) => {
      if (!user) {
        toast(
          t("store.sign_in_cart", "Sign in to add items to cart."),
          "error",
        );
        setLoginOpen(true);
        return;
      }

      const maxStock = Number(product.stock ?? 0);
      if (product.in_stock === false || maxStock <= 0) {
        toast(
          t(
            "store.out_of_stock_toast",
            "Sorry, this item is currently out of stock!",
          ),
          "error",
        );
        return;
      }

      const currentQty = cartQuantityMap.get(product.id) || 0;
      if (currentQty >= maxStock) {
        toast(
          t("store.max_stock_reached", `Only ${maxStock} available in stock!`),
          "error",
        );
        return;
      }

      dispatch({ type: "ADD", product });
      toast(`${product.name} ${t("store.added_to_cart", "added to cart!")}`);
    },
    [user, cartQuantityMap, dispatch, toast, t],
  );

  const handleRemoveFromCart = useCallback(
    (product) => {
      dispatch({ type: "REMOVE", product });
    },
    [dispatch],
  );

  const handleToggleFavorite = useCallback(
    async (product) => {
      if (!user) {
        toast(
          t("store.sign_in_favorite", "Please sign in to save favorites!"),
          "error",
        );
        setLoginOpen(true);
        return;
      }

      // Prevent duplicate requests from rapid clicks
      if (pendingFavsRef.current.has(product.id)) return;
      pendingFavsRef.current.add(product.id);

      const isCurrentlyFavorited = favoriteIds.has(product.id);

      setFavoriteIds((prev) => {
        const newFavs = new Set(prev);
        if (isCurrentlyFavorited) newFavs.delete(product.id);
        else newFavs.add(product.id);
        return newFavs;
      });

      try {
        if (isCurrentlyFavorited) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .match({ user_id: user.id, product_id: product.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert([{ user_id: user.id, product_id: product.id }]);
          if (error) throw error;
        }
      } catch (error) {
        console.error("Error updating favorite:", error.message);
        fetchFavorites(user.id);
        toast(t("store.fav_failed", "Failed to update favorite."), "error");
      } finally {
        pendingFavsRef.current.delete(product.id);
      }
    },
    [user, favoriteIds, fetchFavorites, toast, t],
  );

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("All");
  };

  const modalProduct = selectedProduct
    ? {
        ...selectedProduct,
        quantityInCart: cartQuantityMap.get(selectedProduct.id) || 0,
      }
    : null;

  return (
    <div style={styles.page}>
      <style>
        {`
          .responsive-grid {
            display: grid;
            gap: 12px; 
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
          }

          .mobile-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 16px 40px;
          }

          @media (min-width: 600px) {
            .responsive-grid {
               gap: 20px;
               grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            }
            .mobile-container {
              padding: 0 24px 40px;
            }
          }
        `}
      </style>

      <Hero
        search={search}
        setSearch={setSearch}
        activeCategory={category}
        setCategory={setCategory}
      />

      <main className="mobile-container">
        <div style={styles.header}>
          <h2 style={styles.title}>
            {category === "All"
              ? t("store.all_products", "All Products")
              : category}
            <span style={styles.count}>
              ({filteredProducts.length} {t("store.items", "items")})
            </span>
          </h2>
        </div>

        {filteredProducts.length ? (
          <>
            <div className="responsive-grid">
              {visibleProducts.map((product) => {
                const quantityInCart = cartQuantityMap.get(product.id) || 0;
                const productWithCartData = { ...product, quantityInCart };

                return (
                  <ProductCard
                    key={product.id}
                    product={productWithCartData}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    isFavorite={favoriteIds.has(product.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickView={() => setSelectedProduct(product)}
                  />
                );
              })}
            </div>

            {/* Invisible scroll trigger to smoothly render remaining products */}
            {visibleCount < filteredProducts.length && (
              <div ref={loadMoreRef} style={{ height: 20, width: "100%" }} />
            )}
          </>
        ) : (
          <div style={styles.empty}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <FiSearch size={64} color="#D1D5DB" />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                color: "#616162",
                fontSize: "18px",
              }}
            >
              {t("store.no_products", "No products found")}
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px" }}>
              {t("store.try_different", "Try a different search or category.")}
            </p>
            <Button variant="secondary" onClick={clearFilters}>
              {t("store.clear_filters", "Clear filters")}
            </Button>
          </div>
        )}
      </main>

      {/* --- MODALS & OVERLAYS --- */}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        onSwitchForgot={() => {
          setLoginOpen(false);
          setForgotOpen(true);
        }}
        toast={toast}
      />

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
        toast={toast}
      />

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSwitchLogin={() => {
          setForgotOpen(false);
          setLoginOpen(true);
        }}
        toast={toast}
      />

      <QuickViewModal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={modalProduct}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        isFavorite={
          selectedProduct ? favoriteIds.has(selectedProduct.id) : false
        }
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
