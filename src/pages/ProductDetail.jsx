import { useState, useEffect, useMemo } from "react";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import QuickViewModal from "../components/product/QuickViewModal";
import { useToast } from "../components/ui/Toast";
import { useTranslation } from "react-i18next";

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

  // 2. 🏆 Native Browser Alert for "Not Found"
  useEffect(() => {
    if (!foundProduct) {
      // Small timeout ensures the UI updates smoothly before the alert blocks the screen
      setTimeout(() => {
        const message = t(
          "scanner.not_found_desc",
          "Sorry, this barcode does not exist in our system yet.",
        );
        window.alert(`${message}\n\n${barcode}`);
        onClose(); // Close the scanner after the user clicks "OK"
      }, 50);
    }
  }, [foundProduct, barcode, onClose, t]);

  // 3. Fetch favorite status
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

    if (product.stock <= 0 || product.in_stock === false) {
      toast(t("store.out_of_stock_toast", "Out of stock!"), "error");
      return;
    }

    dispatch({ type: "ADD", product });
    toast(`${product.name} ${t("store.added_to_cart", "added to cart!")}`);
    onClose();
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

  // 4. Prepare product with cart quantity
  const safeCart = Array.isArray(cart) ? cart : [];
  const modalProduct = foundProduct
    ? {
        ...foundProduct,
        quantityInCart:
          safeCart.find((item) => item.id === foundProduct.id)?.quantity || 0,
      }
    : null;

  // 5. If product is NOT found, render nothing (the window.alert handles it)
  if (!foundProduct) {
    return null;
  }

  // 6. If found, render QuickViewModal
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
