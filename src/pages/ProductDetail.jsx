import { useState, useEffect, useMemo } from "react";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import QuickViewModal from "../components/product/QuickViewModal";
import { useToast } from "../components/ui/Toast";
import { useTranslation } from "react-i18next";
import { FiAlertCircle } from "react-icons/fi";

export default function ProductDetail({ barcode, onClose }) {
  const { products } = useStore();
  const { dispatch, cart } = useCart();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { show: toast } = useToast();

  const [favoriteIds, setFavoriteIds] = useState(new Set());

  // 1. Find the product that matches the scanned barcode
  const foundProduct = useMemo(() => {
    return products.find((p) => p.barcode === barcode);
  }, [products, barcode]);

  // 2. Fetch favorites just like HomePage does so the Heart icon works
  useEffect(() => {
    if (user && foundProduct) {
      const fetchFavorite = async () => {
        try {
          const { data, error } = await supabase
            .from("favorites")
            .select("product_id")
            .eq("user_id", user.id)
            .eq("product_id", foundProduct.id);

          if (!error && data.length > 0) {
            setFavoriteIds(new Set([foundProduct.id]));
          }
        } catch (error) {
          console.error("Error fetching favorite status:", error);
        }
      };
      fetchFavorite();
    }
  }, [user, foundProduct]);

  // Handle Cart logic
  const handleAddToCart = (product) => {
    if (!user) {
      toast(t("store.sign_in_cart", "Sign in to add items to cart."), "error");
      return;
    }
    if (product.stock <= 0) {
      toast(t("store.out_of_stock_toast", "Out of stock!"), "error");
      return;
    }
    dispatch({ type: "ADD", product });
    toast(`${product.name} ${t("store.added_to_cart", "added to cart!")}`);
    onClose(); // Optional: Close modal after adding to cart
  };

  const handleRemoveFromCart = (product) => {
    dispatch({ type: "REMOVE", product });
  };

  // Handle Favorite logic
  const handleToggleFavorite = async (product) => {
    if (!user) {
      toast(t("store.sign_in_favorite", "Sign in to save favorites!"), "error");
      return;
    }

    const isCurrentlyFavorited = favoriteIds.has(product.id);

    // Optimistic UI update
    setFavoriteIds((prev) => {
      const newFavs = new Set(prev);
      isCurrentlyFavorited
        ? newFavs.delete(product.id)
        : newFavs.add(product.id);
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
      toast(t("store.fav_failed", "Failed to update favorite."), "error");
    }
  };

  // 3. Prepare product with cart quantity (same as HomePage logic)
  const safeCart = Array.isArray(cart) ? cart : [];
  const modalProduct = foundProduct
    ? {
        ...foundProduct,
        quantityInCart:
          safeCart.find((item) => item.id === foundProduct.id)?.quantity || 0,
      }
    : null;

  // 4. Handle "Product Not Found" scenario
  if (!foundProduct) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl">
          <FiAlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Product Not Found
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            No product matches the barcode:{" "}
            <span className="font-bold text-gray-800">{barcode}</span>
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // 5. If found, render your beautiful QuickViewModal!
  return (
    <QuickViewModal
      open={true}
      onClose={onClose}
      product={modalProduct}
      onAddToCart={handleAddToCart}
      onRemoveFromCart={handleRemoveFromCart}
      isFavorite={favoriteIds.has(foundProduct.id)}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
