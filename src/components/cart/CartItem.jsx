import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { fmt } from "../../utils/currency";

export default function CartItem({ item, dispatch }) {
  const amount = item.qty || item.quantity || 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "20px 0",
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      {/* 1. PRODUCT IMAGE (Checkout Style) */}
      <div
        style={{
          width: "80px",
          height: "80px",
          backgroundColor: "#F8FAFC",
          borderRadius: "12px",
          padding: "12px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #CCE0FF",
        }}
      >
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            mixBlendMode: "darken",
          }}
        />
      </div>

      {/* 2. ITEM DETAILS & CONTROLS */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Name & Single Price */}
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#002966",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name}
          </h3>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0066FF",
              marginTop: "4px",
            }}
          >
            {fmt(item.price)}
          </div>
        </div>

        {/* Quantity Controls (Clean Pill Shape) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "fit-content",
            backgroundColor: "#F8FAFC",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
          }}
        >
          <button
            onClick={() =>
              amount === 1
                ? dispatch({ type: "REMOVE", id: item.id })
                : dispatch({ type: "UPDATE_QTY", id: item.id, qty: amount - 1 })
            }
            style={{
              width: "32px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            <FiMinus size={14} />
          </button>

          <span
            style={{
              width: "36px",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: 600,
              color: "#111827",
              borderLeft: "1px solid #E5E7EB",
              borderRight: "1px solid #E5E7EB",
              padding: "6px 0",
            }}
          >
            {amount}
          </span>

          <button
            onClick={() =>
              dispatch({ type: "UPDATE_QTY", id: item.id, qty: amount + 1 })
            }
            style={{
              width: "32px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            <FiPlus size={14} />
          </button>
        </div>
      </div>

      {/* 3. TOTAL PRICE & TRASH */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: "76px",
          gap: "8px",
        }}
      >
        <button
          onClick={() => dispatch({ type: "REMOVE", id: item.id })}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#ca0303ff",
            padding: "4px",
          }}
          title="Remove Item"
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <FiTrash2 size={18} />
        </button>

        <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
          {fmt(item.price * amount)}
        </div>
      </div>
    </div>
  );
}
