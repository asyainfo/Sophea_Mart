import { useState, useEffect } from "react";
import { FiHeart, FiArrowLeft } from "react-icons/fi";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import ProductCard from "../components/product/ProductCard";
import Button from "../components/ui/Button";

export default function Favorites() {
  const { user } = useAuth();
  const { dispatch, cart } = useCart();

  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavoriteProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFavoriteProducts = async () => {
    setLoading(true);
    try {
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setFavoriteProducts([]);
        setLoading(false);
        return;
      }

      const productIds = favData.map((fav) => fav.product_id);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

      if (productsError) throw productsError;

      setFavoriteProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching favorites:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (product) => {
    // Instantly remove from screen for a snappy feel
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id));

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .match({ user_id: user.id, product_id: product.id });

      if (error) throw error;
    } catch (error) {
      console.error("Error removing favorite:", error.message);
      fetchFavoriteProducts();
    }
  };

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;
    dispatch({ type: "ADD", product });
  };

  const handleRemoveFromCart = (product) => {
    dispatch({ type: "REMOVE", product });
  };

  if (!loading && !user) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <FiHeart size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
        <h2>Please Sign In</h2>
        <p style={{ color: "#6B7280" }}>
          You need to be logged in to view your saved items.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Return to Store
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
            onClick={() => (window.location.href = "/")}
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
            <FiArrowLeft /> Back to Store
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
            <FiHeart fill="#FFFFFF" /> Saved Items
          </h1>
          <p style={{ margin: "8px 0 0", opacity: 0.8, fontSize: 15 }}>
            Your personal collection of favorite products.
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
            <span style={{ color: "#6B7280" }}>Loading your favorites...</span>
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
              No saved items yet
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                color: "#6B7280",
                lineHeight: 1.5,
              }}
            >
              Browse the store and click the heart icon on items you love to
              save them here for later!
            </p>
            <Button onClick={() => (window.location.href = "/")}>
              Browse Products
            </Button>
          </div>
        ) : (
          /* FIXED: Now using the exact same responsive grid as the Homepage */
          <div className="responsive-grid">
            {favoriteProducts.map((product) => {
              const safeCart = Array.isArray(cart) ? cart : [];
              const cartItem = safeCart.find((item) => item.id === product.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              const productWithCartData = { ...product, quantityInCart };

              return (
                <ProductCard
                  key={product.id}
                  product={productWithCartData}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
