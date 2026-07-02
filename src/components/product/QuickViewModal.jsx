import { useState } from "react";
import { FiX, FiShoppingCart, FiCheck, FiHeart } from "react-icons/fi";
import { fmt, fmtKHR } from "../../utils/currency";
import Modal from "../ui/Modal";
import { useTranslation } from "react-i18next";

export default function QuickViewModal({
  open,
  onClose,
  product,
  onAddToCart,
  onRemoveFromCart,
  isFavorite,
  onToggleFavorite,
}) {
  const { t } = useTranslation(); // 🏆 2. Initialized
  const [isJustAdded, setIsJustAdded] = useState(false);

  if (!product) return null;

  // --- LOGIC CHECKS (Same as Product Card) ---
  const isInCart = product.quantityInCart && product.quantityInCart > 0;
  const isOutOfStock = product.stock === 0;

  // --- ACTIONS ---
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    onAddToCart(product);
    setIsJustAdded(true);
    setTimeout(() => setIsJustAdded(false), 1000);
  };

  const getStockStatus = () => {
    if (product.stock > 10)
      return {
        text: t("quick_view.in_stock", "In Stock"),
        bg: "#DBEAFE",
        color: "#2563EB",
      };
    if (product.stock > 0)
      return {
        // 🏆 Uses dynamic variable {{count}}
        text: t("quick_view.only_left", "Only {{count}} left", {
          count: product.stock,
        }),
        bg: "#FEF3C7",
        color: "#92400E",
      };
    return {
      text: t("quick_view.out_of_stock", "Out of Stock"),
      bg: "#FEE2E2",
      color: "#991B1B",
    };
  };
  const stockStatus = getStockStatus();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("quick_view.modal_title", "Product Details")}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Top Section: Image Display */}
        <div
          style={{
            position: "relative",
            height: 280,
            background: "#F8FAFC",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          {/* Favorite Heart */}
          <button
            onClick={() => onToggleFavorite(product)}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 10,
              color: isFavorite ? "#EF4444" : "#9CA3AF",
              transition: "all 0.2s ease",
            }}
          >
            <FiHeart size={20} fill={isFavorite ? "#EF4444" : "none"} />
          </button>

          {/* Stock Badge */}
          {!isOutOfStock && (
            <span
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: stockStatus.bg,
                color: stockStatus.color,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {stockStatus.text}
            </span>
          )}

          {/* Main Image */}
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: isOutOfStock ? 0.4 : 1,
            }}
          />

          {/* Sold Out Overlay */}
          {isOutOfStock && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <span
                style={{
                  background: "#991B1B",
                  color: "#FFFFFF",
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: 1,
                  boxShadow: "0 4px 16px rgba(153, 27, 27, 0.3)",
                }}
              >
                {t("quick_view.sold_out", "SOLD OUT")}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Details & Add to Cart */}
        <div>
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>
              {fmt(product.price)}
            </span>
            <span style={{ fontSize: 16, color: "#9CA3AF", fontWeight: 500 }}>
              {fmtKHR(product.price)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                background: "#F3F4F6",
                color: "#4B5563",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {t("quick_view.category", "Category:")}{" "}
              {product.category || t("quick_view.general", "General")}
            </span>
            {product.sizes && (
              <span
                style={{
                  background: "#F3F4F6",
                  color: "#4B5563",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {t("quick_view.size", "Size:")} {product.sizes}
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: 15,
              color: "#4B5563",
              lineHeight: 1.6,
              marginBottom: 30,
            }}
          >
            {product.description ||
              t(
                "quick_view.no_desc",
                "No specific description available for this item.",
              )}
          </p>

          {/* Big Add to Cart Section */}
          <div
            style={{
              display: "flex",
              gap: 12,
              borderTop: "1px solid #E5E7EB",
              paddingTop: 20,
            }}
          >
            {isInCart ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#ffffff",
                  border: "2px solid #2563EB",
                  borderRadius: 12,
                  height: 50,
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => onRemoveFromCart(product)}
                  style={{
                    width: 50,
                    height: "100%",
                    border: "none",
                    background: "#EFF6FF",
                    color: "#2563EB",
                    cursor: "pointer",
                    fontSize: 24,
                  }}
                >
                  −
                </button>
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}
                >
                  {/* 🏆 Uses dynamic variable {{count}} */}
                  {t("quick_view.in_cart", "{{count}} in Cart", {
                    count: product.quantityInCart,
                  })}
                </span>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= product.quantityInCart}
                  style={{
                    width: 50,
                    height: "100%",
                    border: "none",
                    background:
                      product.stock <= product.quantityInCart
                        ? "#F3F4F6"
                        : "#EFF6FF",
                    color:
                      product.stock <= product.quantityInCart
                        ? "#D1D5DB"
                        : "#2563EB",
                    cursor:
                      product.stock <= product.quantityInCart
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 24,
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                style={{
                  flex: 1,
                  height: 50,
                  border: "none",
                  borderRadius: 12,
                  background: isOutOfStock
                    ? "#F3F4F6"
                    : isJustAdded
                      ? "#10B981"
                      : "#2563EB",
                  color: isOutOfStock ? "#9CA3AF" : "#FFFFFF",
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  transition: "background 0.2s",
                }}
              >
                {isJustAdded ? (
                  <FiCheck size={20} />
                ) : (
                  <FiShoppingCart size={20} />
                )}
                {isJustAdded
                  ? t("quick_view.added", "Added!")
                  : isOutOfStock
                    ? t("quick_view.out_of_stock", "Sold Out")
                    : t("quick_view.add_to_cart", "Add to Cart")}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: 100,
                height: 50,
                background: "#F3F4F6",
                color: "#4B5563",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("quick_view.close", "Close")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
