import { useState } from "react";
import { FiShoppingCart, FiCheck } from "react-icons/fi";
import { fmt, fmtKHR } from "../../utils/currency";

export default function ProductCard({
  product,
  onAddToCart,
  onRemoveFromCart,
}) {
  const [hovered, setHovered] = useState(false);
  const [isJustAdded, setIsJustAdded] = useState(false);

  // 1. Clean logic checks
  const isInCart = product.quantityInCart && product.quantityInCart > 0;
  const isOutOfStock = product.stock === 0;

  // 2. The magic function that handles the animation
  const handleAddToCart = () => {
    if (isOutOfStock) return;

    onAddToCart(product);
    setIsJustAdded(true);

    // Remove the green checkmark after 1 second
    setTimeout(() => {
      setIsJustAdded(false);
    }, 1000);
  };

  // 3. Simplified Stock Status
  const getStockStatus = () => {
    if (product.stock > 10)
      return { text: "In Stock", bg: "#DBEAFE", color: "#2563EB" };
    if (product.stock > 0)
      return { text: `${product.stock} left`, bg: "#FEF3C7", color: "#92400E" };
    return { text: "Out of Stock", bg: "#FEE2E2", color: "#991B1B" };
  };
  const stockStatus = getStockStatus();

  // 4. Dynamic Styles based on state
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
  };

  const contentAreaStyle = {
    padding: 16,
    background: isInCart ? "#EFF6FF" : "#ffffff",
    transition: "background 0.25s ease",
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      {/* Product Image Header */}
      <div
        style={{
          height: 140,
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "16px",
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            // Dim the image if out of stock
            opacity: isOutOfStock ? 0.4 : 1,
            transition: "opacity 0.3s ease",
          }}
        />

        {/* ADDED: Big Sold Out Overlay */}
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
              SOLD OUT
            </span>
          </div>
        )}

        {/* Small Corner Badge (Hide if completely sold out to avoid clutter) */}
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

      {/* Bottom Content Area */}
      <div style={contentAreaStyle}>
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 16,
            fontWeight: 600,
            color: isOutOfStock ? "#9CA3AF" : "#111827", // Grey out text if sold out
            lineHeight: 1.4,
          }}
        >
          {product.name}
        </h3>

        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "#6B7280",
            lineHeight: 1.5,
          }}
        >
          {product.description?.slice(0, 60)}...
        </p>

        {/* Sizes & Variants Wrapper */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
            opacity: isOutOfStock ? 0.5 : 1, // Dim variants if out of stock
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
                display: "inline-block",
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

        {/* Price & Actions */}
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
            <div style={{ fontSize: 14, color: "#9CA3AF" }}>
              {fmtKHR(product.price)}
            </div>
          </div>

          {/* Conditional Button / Quantity Selector */}
          {isJustAdded ? (
            <button
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
                transition: "all 0.2s ease",
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
                onClick={() => onRemoveFromCart(product)}
                style={{
                  width: 32,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: "#4B5563",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                {product.quantityInCart}
              </span>

              {/* Prevent clicking '+' if they reached max stock */}
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= product.quantityInCart}
                style={{
                  width: 32,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color:
                    product.stock <= product.quantityInCart
                      ? "#D1D5DB"
                      : "#2563EB",
                  cursor:
                    product.stock <= product.quantityInCart
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
