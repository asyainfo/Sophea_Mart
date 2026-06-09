import { FiX, FiShoppingBag } from "react-icons/fi";
import { useCart } from "../../hooks/useCart";
import { fmt, fmtKHR } from "../../utils/currency";
import CartItem from "./CartItem";

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  const { items, total, dispatch } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(17, 24, 39, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 2147483646,
        }}
      />

      {/* DRAWER */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          zIndex: 2147483647,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FiShoppingBag size={22} color="#0066FF" />
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Your Cart{" "}
              <span
                style={{ color: "#6B7280", fontSize: "16px", fontWeight: 500 }}
              >
                ({items.length})
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F3F4F6",
              color: "#4B5563",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* CART ITEMS */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
          {items.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#9CA3AF",
              }}
            >
              <FiShoppingBag
                size={56}
                style={{ marginBottom: "16px", opacity: 0.5 }}
              />
              <p style={{ fontSize: "16px", fontWeight: 500 }}>
                Your cart is empty.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <CartItem key={item.id} item={item} dispatch={dispatch} />
            ))
          )}
        </div>

        {/* FOOTER (Matches Checkout Order Summary) */}
        {items.length > 0 && (
          <div
            style={{
              padding: "24px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #E5E7EB",
            }}
          >
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E5E7EB",
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    color: "#4B5563",
                    fontWeight: 500,
                  }}
                >
                  Subtotal (USD)
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {fmt(total)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px", color: "#6B7280" }}>
                  Subtotal (KHR)
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#6B7280",
                  }}
                >
                  {fmtKHR(total)}
                </span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              style={{
                width: "100%",
                padding: "16px",
                backgroundColor: "#0066FF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0, 102, 255, 0.25)",
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
