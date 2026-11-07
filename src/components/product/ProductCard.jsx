import { useState, useRef, useEffect, memo } from "react";
import { FiShoppingCart, FiCheck, FiHeart, FiImage } from "react-icons/fi";
import { fmt, fmtKHR } from "../../utils/currency";
import { useTranslation } from "react-i18next";

function ProductCard({
  product,
  onAddToCart,
  onRemoveFromCart,
  isFavorite = false,
  onToggleFavorite,
  onQuickView,
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef(null);
  const prevQtyRef = useRef(product.quantityInCart || 0);

  // Reset image error state if product.image changes
  useEffect(() => {
    setImgError(false);
  }, [product?.image]);

  // Only trigger the green checkmark when quantityInCart actually increases from 0 -> 1
  useEffect(() => {
    const currentQty = product.quantityInCart || 0;
    if (prevQtyRef.current === 0 && currentQty > 0) {
      setIsJustAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsJustAdded(false), 900);
    }
    prevQtyRef.current = currentQty;
  }, [product.quantityInCart]);

  // Clean up timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // --- LOGIC CHECKS ---
  const qtyInCart = Number(product.quantityInCart || 0);
  const stockCount = Number(product.stock ?? 0);
  const isInCart = qtyInCart > 0;
  const isOutOfStock = stockCount <= 0 || product.in_stock === false;

  // Normalize image URL safely so empty strings "" are never passed to <img src>
  const rawImage =
    typeof product.image === "string" ? product.image.trim() : "";
  const validImageSrc =
    !rawImage || imgError
      ? null
      : rawImage.startsWith("http") || rawImage.startsWith("/")
        ? rawImage
        : `/${rawImage}`;

  // --- ACTIONS ---
  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onRemoveFromCart(product);
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product);
    }
  };

  const handleQuickView = () => {
    if (onQuickView) {
      onQuickView(product);
    }
  };

  // --- COMPUTED STYLES ---
  const getStockStatus = () => {
    if (stockCount > 10)
      return {
        text: t("quick_view.in_stock", "In Stock"),
        bg: "#DBEAFE",
        color: "#2563EB",
      };
    if (stockCount > 0)
      return {
        text: t("quick_view.only_left", "Only {{count}} left", {
          count: stockCount,
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

  const cardStyle = {
    background: "#fff",
    borderRadius: 20,
    border: isInCart ? "2px solid #2563EB" : "1px solid #E5E7EB",
    overflow: "hidden",
    transition: "all 0.25s ease",
    transform: hovered ? "translateY(-6px)" : "translateY(0)",
    boxShadow:
      hovered || isInCart
        ? "0 12px 30px rgba(37,99,235,0.12)"
        : "0 2px 8px rgba(0,0,0,0.05)",
    position: "relative",
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      {/* --- IMAGE HEADER --- */}
      <div
        onClick={handleQuickView}
        style={{
          height: 140,
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: 16,
          cursor: "pointer",
        }}
      >
        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label="Toggle Favorite"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.9)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            color: isFavorite ? "#EF4444" : "#9CA3AF",
            transition: "all 0.2s ease",
            transform: hovered ? "scale(1.05)" : "scale(1)",
            zIndex: 10,
          }}
        >
          <FiHeart size={16} fill={isFavorite ? "#EF4444" : "none"} />
        </button>

        {/* ⚡ SAFE IMAGE RENDERING: Never passes src="" and prevents alt-text overlap */}
        {validImageSrc ? (
          <img
            src={validImageSrc}
            alt={product.name || "Product"}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: isOutOfStock ? 0.4 : 1,
              transition: "opacity 0.3s ease",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#CBD5E1",
              gap: 6,
            }}
          >
            <FiImage size={36} />
          </div>
        )}

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
                padding: "6px 16px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 1,
                boxShadow: "0 4px 12px rgba(153, 27, 27, 0.3)",
              }}
            >
              {t("quick_view.sold_out", "SOLD OUT")}
            </span>
          </div>
        )}

        {/* Stock Badge (Top Right) */}
        {!isOutOfStock && (
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: stockStatus.bg,
              color: stockStatus.color,
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {stockStatus.text}
          </span>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div
        style={{
          padding: 16,
          background: isInCart ? "#EFF6FF" : "#ffffff",
          transition: "background 0.25s ease",
        }}
      >
        <h3
          onClick={handleQuickView}
          style={{
            margin: "0 0 6px",
            fontSize: 16,
            fontWeight: 600,
            color: isOutOfStock ? "#9CA3AF" : "#111827",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: "pointer",
          }}
        >
          {product.name}
        </h3>

        {product.description ? (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              color: "#6B7280",
              lineHeight: 1.5,
            }}
          >
            {product.description.length > 50
              ? `${product.description.slice(0, 50)}...`
              : product.description}
          </p>
        ) : (
          <div style={{ height: 12 }} />
        )}

        {/* Variants */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
            opacity: isOutOfStock ? 0.5 : 1,
          }}
        >
          {product.sizes && (
            <span
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 999,
                background: isInCart ? "#ffffff" : "#F3F4F6",
                color: "#374151",
                fontWeight: 500,
              }}
            >
              {product.sizes}
            </span>
          )}
          {product.variants && typeof product.variants === "string" && (
            <span
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 999,
                background: isInCart ? "#DBEAFE" : "#EFF6FF",
                color: "#2563EB",
                fontWeight: 500,
              }}
            >
              ● {product.variants}
            </span>
          )}
        </div>

        {/* Price & Cart Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ opacity: isOutOfStock ? 0.5 : 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#2563EB" }}>
              {fmt(product.price)}
            </div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>
              {fmtKHR(product.price)}
            </div>
          </div>

          {/* Cart Buttons */}
          {isJustAdded ? (
            <button
              type="button"
              style={{
                width: 42,
                height: 42,
                border: "none",
                borderRadius: 12,
                background: "#10B981",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiCheck size={20} />
            </button>
          ) : isInCart ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #BFDBFE",
                borderRadius: 12,
                height: 42,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  width: 32,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: "#4B5563",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                −
              </button>
              <span
                style={{
                  width: 24,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {qtyInCart}
              </span>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={stockCount <= qtyInCart}
                style={{
                  width: 32,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: stockCount <= qtyInCart ? "#D1D5DB" : "#2563EB",
                  cursor: stockCount <= qtyInCart ? "not-allowed" : "pointer",
                  fontSize: 16,
                }}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={{
                width: 42,
                height: 42,
                border: "none",
                borderRadius: 12,
                background: isOutOfStock
                  ? "#F3F4F6"
                  : hovered
                    ? "#2563EB"
                    : "#F3F4F6",
                color: isOutOfStock
                  ? "#9CA3AF"
                  : hovered
                    ? "#FFFFFF"
                    : "#6B7280",
                cursor: isOutOfStock ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                transform:
                  hovered && !isOutOfStock ? "scale(1.05)" : "scale(1)",
              }}
            >
              <FiShoppingCart size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom deep-value check so inline props in HomePage don't cause all 271 cards to re-render
function arePropsEqual(prev, next) {
  const p1 = prev.product;
  const p2 = next.product;
  return (
    prev.isFavorite === next.isFavorite &&
    p1.id === p2.id &&
    p1.quantityInCart === p2.quantityInCart &&
    p1.stock === p2.stock &&
    p1.in_stock === p2.in_stock &&
    p1.price === p2.price &&
    p1.name === p2.name &&
    p1.image === p2.image &&
    p1.sizes === p2.sizes &&
    p1.description === p2.description
  );
}

export default memo(ProductCard, arePropsEqual);
