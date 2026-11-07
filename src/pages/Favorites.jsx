import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiArrowLeft } from "react-icons/fi";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useStore } from "../hooks/useStore";
import ProductCard from "../components/product/ProductCard";
import QuickViewModal from "../components/product/QuickViewModal";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next";

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { dispatch, items: cartItems = [] } = useCart();
  const { products: cachedProducts = [] } = useStore() || {};

  const [favoriteIds, setFavoriteIds] = useState([]);
  const [extraProducts, setExtraProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavoriteIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);

      if (favError) throw favError;

      const ids = (favData || []).map((f) => f.product_id).filter(Boolean);
      setFavoriteIds(ids);

      // Only query Supabase for products not already in our StoreContext cache
      if (ids.length > 0) {
        const cachedIdSet = new Set((cachedProducts || []).map((p) => p.id));
        const missingIds = ids.filter((id) => !cachedIdSet.has(id));

        if (missingIds.length > 0) {
          const { data: missingData } = await supabase
            .from("products")
            .select("*")
            .in("id", missingIds);
          if (missingData) setExtraProducts(missingData);
        }
      }
    } catch (error) {
      console.error("Error fetching favorites:", error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, cachedProducts]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Combine cached products + any fallback products matching favoriteIds
  const favoriteProducts = useMemo(() => {
    if (favoriteIds.length === 0) return [];
    const productMap = new Map();
    (cachedProducts || []).forEach((p) => productMap.set(p.id, p));
    (extraProducts || []).forEach((p) => productMap.set(p.id, p));

    return favoriteIds.map((id) => productMap.get(id)).filter(Boolean);
  }, [favoriteIds, cachedProducts, extraProducts]);

  // Fast O(1) lookup for quantity in cart
  const cartQtyMap = useMemo(() => {
    const map = new Map();
    (cartItems || []).forEach((item) => {
      map.set(item.id, Number(item.quantity ?? item.qty ?? 1));
    });
    return map;
  }, [cartItems]);

  const handleToggleFavorite = useCallback(
    async (product) => {
      if (!userId || !product?.id) return;

      // Instantly remove from screen for a snappy feel
      setFavoriteIds((prev) => prev.filter((id) => id !== product.id));
      setQuickViewProduct((prev) => (prev?.id === product.id ? null : prev));

      try {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .match({ user_id: userId, product_id: product.id });

        if (error) throw error;
      } catch (error) {
        console.error("Error removing favorite:", error.message);
        fetchFavorites();
      }
    },
    [userId, fetchFavorites],
  );

  const handleAddToCart = useCallback(
    (product) => {
      if (!product || product.stock <= 0 || product.in_stock === false) return;
      dispatch({ type: "ADD", product });
    },
    [dispatch],
  );

  const handleRemoveFromCart = useCallback(
    (product) => {
      if (!product?.id) return;
      dispatch({ type: "DECREMENT", id: product.id, product });
    },
    [dispatch],
  );

  const activeQuickViewProduct = useMemo(() => {
    if (!quickViewProduct) return null;
    return {
      ...quickViewProduct,
      quantityInCart: cartQtyMap.get(quickViewProduct.id) || 0,
    };
  }, [quickViewProduct, cartQtyMap]);

  if (!loading && !userId) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <FiHeart size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
        <h2>{t("favorites.please_sign_in", "Please Sign In")}</h2>
        <p style={{ color: "#6B7280", marginBottom: 20 }}>
          {t(
            "favorites.sign_in_desc",
            "You need to be logged in to view your saved items.",
          )}
        </p>
        <Button onClick={() => navigate("/")}>
          {t("favorites.return_store", "Return to Store")}
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#f9fafb", paddingBottom: 60 }}
    >
      {/* --- INJECTED GRID STYLES TO MATCH HOMEPAGE --- */}
      <style>
        {`
          .responsive-grid {
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(2, 1fr); 
          }

          @media (min-width: 500px) {
            .responsive-grid {
               grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            }
          }
        `}
      </style>

      {/* --- BLUE HERO HEADER --- */}
      <div
        style={{
          background: "#0066FF",
          padding: "40px 20px 80px",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              fontWeight: 500,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.3)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
          >
            <FiArrowLeft /> {t("favorites.back_to_store", "Back to Store")}
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FiHeart fill="#FFFFFF" />{" "}
            {t("favorites.saved_items", "Saved Items")}
          </h1>
          <p style={{ margin: "8px 0 0", opacity: 0.8, fontSize: 15 }}>
            {t(
              "favorites.saved_desc",
              "Your personal collection of favorite products.",
            )}
          </p>
        </div>
      </div>

      {/* --- CONTENT AREA OVERLAP --- */}
      <div
        style={{
          maxWidth: 1200,
          margin: "-40px auto 0",
          padding: "0 24px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              background: "white",
              borderRadius: 16,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            <span style={{ color: "#6B7280" }}>
              {t("favorites.loading", "Loading your favorites...")}
            </span>
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#FFF",
              borderRadius: 16,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              border: "1px solid #E5E7EB",
              maxWidth: 800,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: "#FEF2F2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <FiHeart size={32} color="#EF4444" />
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "#111827", fontSize: 20 }}>
              {t("favorites.no_saved", "No saved items yet")}
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                color: "#6B7280",
                lineHeight: 1.5,
              }}
            >
              {t(
                "favorites.no_saved_desc",
                "Browse the store and click the heart icon on items you love to save them here for later!",
              )}
            </p>
            <Button onClick={() => navigate("/")}>
              {t("favorites.browse_products", "Browse Products")}
            </Button>
          </div>
        ) : (
          <div className="responsive-grid">
            {favoriteProducts.map((product) => {
              const quantityInCart = cartQtyMap.get(product.id) || 0;
              const productWithCartData = { ...product, quantityInCart };

              return (
                <ProductCard
                  key={product.id}
                  product={productWithCartData}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onOpenQuick={setQuickViewProduct}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        open={Boolean(activeQuickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        product={activeQuickViewProduct}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        isFavorite={true}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
