import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { fmt } from "../../utils/currency";
import { useTranslation } from "react-i18next"; // 🏆 1. Imported

export default function CartItem({ item, dispatch }) {
  const { t } = useTranslation(); // 🏆 2. Initialized
  const amount = item.qty || item.quantity || 1;

  const isGift = Boolean(item.isGift);
  const isAtMaxStock = item.stock !== undefined && amount >= item.stock;

  // --- EVENT HANDLERS ---
  const handlePlusClick = () => {
    if (isAtMaxStock) {
      window.dispatchEvent(
        new CustomEvent("global-toast", {
          detail: {
            // 🏆 Translated Toast Warning
            message: `${t("cart_item.sorry_stock_1", "Sorry, we only have")} ${item.stock} ${t("cart_item.sorry_stock_2", "left in stock!")}`,
            type: "error",
          },
        }),
      );
      return;
    }
    dispatch({ type: "UPDATE_QTY", id: item.id, qty: amount + 1 });
  };

  const handleMinusClick = () => {
    if (amount === 1) {
      dispatch({ type: "REMOVE", id: item.id });
    } else {
      dispatch({ type: "UPDATE_QTY", id: item.id, qty: amount - 1 });
    }
  };

  const handleRemoveClick = () => {
    dispatch({ type: "REMOVE", id: item.id });
  };

  return (
    <div style={styles.container}>
      {/* 1. PRODUCT IMAGE */}
      <div style={styles.imageBox}>
        <img src={item.image} alt={item.name} style={styles.image} />
      </div>

      {/* 2. ITEM DETAILS & CONTROLS */}
      <div style={styles.detailsArea}>
        <div>
          <h3 style={styles.name}>{item.name}</h3>
          {/* 🏆 Translated "FREE" */}
          <div style={styles.price}>
            {isGift ? t("cart_item.free", "FREE") : fmt(item.price)}
          </div>
        </div>

        {/* Conditional Quantity Controls vs Gift Badge */}
        {!isGift ? (
          <div style={styles.qtyWrapper}>
            <button onClick={handleMinusClick} style={styles.qtyBtn}>
              <FiMinus size={14} />
            </button>

            <span style={styles.qtyText}>{amount}</span>

            <button
              onClick={handlePlusClick}
              disabled={isAtMaxStock}
              style={{
                ...styles.qtyBtn,
                opacity: isAtMaxStock ? 0.3 : 1,
                cursor: isAtMaxStock ? "not-allowed" : "pointer",
              }}
            >
              <FiPlus size={14} />
            </button>
          </div>
        ) : (
          /* 🏆 Translated "Gift Selected" */
          <div style={styles.giftBadge}>
            {t("cart_item.gift_selected", "Gift Selected")}
          </div>
        )}
      </div>

      {/* 3. TOTAL PRICE & TRASH */}
      <div style={styles.actionArea}>
        <button
          onClick={handleRemoveClick}
          style={styles.removeBtn}
          title={t(
            "cart_item.remove_item",
            "Remove Item",
          )} /* 🏆 Translated Hover Title */
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ca0303")}
        >
          <FiTrash2 size={18} />
        </button>

        <div style={styles.totalPrice}>
          {isGift ? "$0.00" : fmt(item.price * amount)}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EXTRACTED STYLES
// ==========================================
const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  imageBox: {
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
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    mixBlendMode: "darken",
  },
  detailsArea: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  name: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
    color: "#002966",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  price: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0066FF",
    marginTop: "4px",
  },
  qtyWrapper: {
    display: "flex",
    alignItems: "center",
    width: "fit-content",
    backgroundColor: "#F8FAFC",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
  },
  qtyBtn: {
    width: "32px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color: "#6B7280",
  },
  qtyText: {
    width: "36px",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
    borderLeft: "1px solid #E5E7EB",
    borderRight: "1px solid #E5E7EB",
    padding: "6px 0",
  },
  giftBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#10B981",
    backgroundColor: "#D1FAE5",
    padding: "4px 8px",
    borderRadius: "6px",
    width: "fit-content",
  },
  actionArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "76px",
    gap: "8px",
  },
  removeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#ca0303",
    padding: "4px",
    transition: "color 0.2s ease",
  },
  totalPrice: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
  },
};
