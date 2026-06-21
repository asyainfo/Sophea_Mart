import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import ProductCard from "../components/product/ProductCard";
import QuickViewModal from "../components/product/QuickViewModal";

export default function Home() {
  const { user } = useAuth();
  const { cartItems, addToCart, removeFromCart } = useCart();

  const [products, setProducts] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 1. Fetch Active Products on Load
  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. Fetch Favorites when User Logs In
  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      // 🏆 UPGRADED: Added .eq("in_stock", true) to automatically hide disabled items
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("in_stock", true)
        .order("id");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error.message);
    } finally {
      setLoading(false);
    }
  };

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

  // 3. Heart Button Logic
  const handleToggleFavorite = async (product) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("global-toast", {
          detail: {
            message: "Please sign in to save favorites!",
            type: "error",
          },
        }),
      );
      return;
    }

    const isCurrentlyFavorited = favoriteIds.has(product.id);

    // Optimistic Update
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
      fetchFavorites();
    }
  };

  // DYNAMIC MODAL DATA
  const modalProduct = selectedProduct
    ? {
        ...selectedProduct,
        quantityInCart:
          cartItems.find((item) => item.id === selectedProduct.id)?.quantity ||
          0,
      }
    : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Products</h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const cartItem = cartItems.find((item) => item.id === product.id);
            const quantityInCart = cartItem ? cartItem.quantity : 0;
            const productWithCartData = { ...product, quantityInCart };

            return (
              <ProductCard
                key={product.id}
                product={productWithCartData}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                isFavorite={favoriteIds.has(product.id)}
                onToggleFavorite={handleToggleFavorite}
                onQuickView={() => setSelectedProduct(product)}
              />
            );
          })}
        </div>
      )}

      <QuickViewModal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={modalProduct}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        isFavorite={
          selectedProduct ? favoriteIds.has(selectedProduct.id) : false
        }
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
