import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { supabase } from "../services/supabase";
import { USD_TO_KHR } from "../utils/currency";
import { FiSearch } from "react-icons/fi";

import Hero from "../components/layout/Hero";
import ProductCard from "../components/product/ProductCard";
import LoginModal from "../components/auth/LoginModal";
import RegisterModal from "../components/auth/RegisterModal";
import QuickViewModal from "../components/product/QuickViewModal";
import { Toast, useToast } from "../components/ui/Toast";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next";

const styles = {
  page: {
    minHeight: "100vh",
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
  const { products } = useStore();
  const { dispatch, cart } = useCart();
  const { toasts, show: toast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavoriteIds(new Set(data.map((fav) => fav.product_id)));
    } catch (error) {
      console.error("Error fetching favorites:", error.message);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;
      const searchMatch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [products, search, category]);

  const handleAddToCart = (product) => {
    if (!user) {
      toast(t("store.sign_in_cart", "Sign in to add items to cart."), "error");
      setLoginOpen(true);
      return;
    }

    if (product.stock <= 0) {
      toast(
        t(
          "store.out_of_stock_toast",
          "Sorry, this item is currently out of stock!",
        ),
        "error",
      );
      return;
    }

    dispatch({ type: "ADD", product });
    toast(`${product.name} ${t("store.added_to_cart", "added to cart!")}`);
  };

  const handleRemoveFromCart = (product) => {
    dispatch({ type: "REMOVE", product });
  };

  const handleToggleFavorite = async (product) => {
    if (!user) {
      toast(
        t("store.sign_in_favorite", "Please sign in to save favorites!"),
        "error",
      );
      setLoginOpen(true);
      return;
    }

    const isCurrentlyFavorited = favoriteIds.has(product.id);

    setFavoriteIds((prev) => {
      const newFavs = new Set(prev);
      if (isCurrentlyFavorited) newFavs.delete(product.id);
      else newFavs.add(product.id);
      return newFavs;
    });

    try {
      if (isCurrentlyFavorited) {
        await supabase
          .from("favorites")
          .delete()
          .match({ user_id: user.id, product_id: product.id });
      } else {
        await supabase
          .from("favorites")
          .insert([{ user_id: user.id, product_id: product.id }]);
      }
    } catch (error) {
      console.error("Error updating favorite:", error.message);
      fetchFavorites();
      toast(t("store.fav_failed", "Failed to update favorite."), "error");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
  };

  const safeCart = Array.isArray(cart) ? cart : [];
  const modalProduct = selectedProduct
    ? {
        ...selectedProduct,
        quantityInCart:
          safeCart.find((item) => item.id === selectedProduct.id)?.quantity ||
          0,
      }
    : null;

  return (
    <div style={styles.page}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

          @keyframes slideIn {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          .responsive-grid {
            display: grid;
            gap: 12px; 
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
          }

          .mobile-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 16px 64px; 
          }

          @media (min-width: 600px) {
            .responsive-grid {
               gap: 20px;
               grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            }
            .mobile-container {
              padding: 0 24px 64px;
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
          <div className="responsive-grid">
            {filteredProducts.map((product) => {
              const cartItem = safeCart.find((item) => item.id === product.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
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
                color: "#616162ff",
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

      {/* --- MODALS --- */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
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

      <Toast toasts={toasts} />
    </div>
  );
}
