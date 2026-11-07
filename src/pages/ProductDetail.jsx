import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import QuickViewModal from "../components/product/QuickViewModal";
import { useToast } from "../components/ui/Toast";
import { useTranslation } from "react-i18next";

export default function ProductDetail({ barcode, onClose }) {
  const { products = [], loading: storeLoading } = useStore() || {};
  const { dispatch, items: cartItems = [] } = useCart();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { t } = useTranslation();
  const { show: toast } = useToast();

  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const alertShownRef = useRef(false);

  // 1. Find the product that matches the scanned barcode (normalized string match)
  const foundProduct = useMemo(() => {
    const cleanTarget = String(barcode ?? "").trim();
    if (!cleanTarget) return null;
    return (
      products.find((p) => String(p?.barcode ?? "").trim() === cleanTarget) ||
      null
    );
  }, [products, barcode]);

  const foundProductId = foundProduct?.id ?? null;

  // Reset alert guard when barcode changes
  useEffect(() => {
    alertShownRef.current = false;
  }, [barcode]);

  // 2. 🏆 Native Browser Alert for "Not Found" (Wait until store finishes loading & prevent double-alert)
  useEffect(() => {
    if (storeLoading || !barcode || foundProduct || alertShownRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (alertShownRef.current) return;
      alertShownRef.current = true;

      const message = t(
        "scanner.not_found_desc",
        "Sorry, this barcode does not exist in our system yet.",
      );
      window.alert(`${message}\n\n${barcode}`);
      if (typeof onClose === "function") onClose();
    }, 50);

    return () => clearTimeout(timer);
  }, [storeLoading, foundProduct, barcode, onClose, t]);

  // 3. Fetch favorite status (Only runs once per userId + foundProductId)
  useEffect(() => {
    if (!userId || !foundProductId) {
      setFavoriteIds(new Set());
      return;
    }

    let isMounted = true;
    const fetchFavorite = async () => {
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", userId)
          .eq("product_id", foundProductId)
          .maybeSingle();

        if (!error && isMounted) {
          setFavoriteIds(data ? new Set([foundProductId]) : new Set());
        }
      } catch (error) {
        console.error("Error fetching favorite status:", error);
      }
    };

    fetchFavorite();
    return () => {
      isMounted = false;
    };
  }, [userId, foundProductId]);

  // Handle Cart logic
  const handleAddToCart = useCallback(
    (product) => {
      if (!userId) {
        toast(
          t("store.sign_in_cart", "Sign in to add items to cart."),
          "error",
        );
        return;
      }

      if (!product || product.stock <= 0 || product.in_stock === false) {
        toast(t("store.out_of_stock_toast", "Out of stock!"), "error");
        return;
      }

      dispatch({ type: "ADD", product });
      toast(`${product.name} ${t("store.added_to_cart", "added to cart!")}`);
    },
    [userId, dispatch, toast, t],
  );

  const handleRemoveFromCart = useCallback(
    (product) => {
      if (!product?.id) return;
      dispatch({ type: "DECREMENT", id: product.id, product });
    },
    [dispatch],
  );

  // Handle Favorite logic
  const handleToggleFavorite = useCallback(
    async (product) => {
      if (!userId) {
        toast(
          t("store.sign_in_favorite", "Sign in to save favorites!"),
          "error",
        );
        return;
      }

      if (!product?.id) return;
      const isCurrentlyFavorited = favoriteIds.has(product.id);

      setFavoriteIds((prev) => {
        const newFavs = new Set(prev);
        if (isCurrentlyFavorited) {
          newFavs.delete(product.id);
        } else {
          newFavs.add(product.id);
        }
        return newFavs;
      });

      try {
        if (isCurrentlyFavorited) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .match({ user_id: userId, product_id: product.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .insert([{ user_id: userId, product_id: product.id }]);
          if (error) throw error;
        }
      } catch {
        // Rollback on failure
        setFavoriteIds((prev) => {
          const rollbackFavs = new Set(prev);
          if (isCurrentlyFavorited) {
            rollbackFavs.add(product.id);
          } else {
            rollbackFavs.delete(product.id);
          }
          return rollbackFavs;
        });
        toast(t("store.fav_failed", "Failed to update favorite."), "error");
      }
    },
    [userId, favoriteIds, toast, t],
  );

  // 4. Prepare product with accurate cart quantity
  const modalProduct = useMemo(() => {
    if (!foundProduct) return null;
    const cartItem = (cartItems || []).find(
      (item) => item.id === foundProduct.id,
    );
    const quantityInCart = cartItem
      ? Number(cartItem.quantity ?? cartItem.qty ?? 1)
      : 0;

    return {
      ...foundProduct,
      quantityInCart,
    };
  }, [foundProduct, cartItems]);

  // 5. If product is NOT found, render nothing (the window.alert handles it)
  if (!modalProduct) {
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
      isFavorite={favoriteIds.has(modalProduct.id)}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
