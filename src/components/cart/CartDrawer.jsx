import { useState, useEffect } from "react";
import {
  FiX,
  FiShoppingBag,
  FiGift,
  FiLock,
  FiTag,
  FiCheckCircle,
} from "react-icons/fi";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import { fmt, fmtKHR } from "../../utils/currency";
import CartItem from "./CartItem";

// --- STATIC DATA ---
const FREE_GIFT_THRESHOLD = 15;
const BRAND_BLUE = "#2563EB";
const BRAND_GREEN = "#10B981";

// Fake database of gifts (Can be moved to DB later)
const AVAILABLE_GIFTS = [
  {
    id: "gift-1",
    name: "Sophea Mart Tote Bag",
    price: 0,
    isGift: true,
    stock: 100,
    image: "https://cdn-icons-png.flaticon.com/512/1055/1055644.png",
  },
  {
    id: "gift-2",
    name: "Premium Lychee Candy",
    price: 0,
    isGift: true,
    stock: 100,
    image: "https://cdn-icons-png.flaticon.com/512/2619/2619488.png",
  },
];

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  // --- GLOBAL CONTEXT ---
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  // --- LOCAL STATE ---
  const [vouchers, setVouchers] = useState([]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // --- DERIVED STATE ---
  const progressPercentage = Math.min((total / FREE_GIFT_THRESHOLD) * 100, 100);
  const amountRemaining = Math.max(FREE_GIFT_THRESHOLD - total, 0);
  const isFreeGiftUnlocked = total >= FREE_GIFT_THRESHOLD;
  const hasClaimedGift = items.some((item) => item.isGift);
  const paidItemsCount = items.filter((item) => !item.isGift).length;

  // Calculate final totals with discount applied
  // Conversion: 4000 KHR = 1 USD
  const discountUsd = appliedVoucher ? appliedVoucher.discount_khr / 4000 : 0;
  const finalTotalUsd = Math.max(total - discountUsd, 0);

  // --- EFFECTS ---

  // 1. Fetch un-used vouchers from database
  useEffect(() => {
    async function fetchVouchers() {
      if (!user || !isOpen) return;
      try {
        const { data, error } = await supabase
          .from("user_vouchers")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_used", false);

        if (error) throw error;
        setVouchers(data || []);
      } catch (err) {
        console.error("Error fetching vouchers:", err);
      }
    }
    fetchVouchers();
  }, [user, isOpen]);

  // 2. Auto-Remove Gift if total drops below threshold
  useEffect(() => {
    if (total < FREE_GIFT_THRESHOLD) {
      const claimedGifts = items.filter((item) => item.isGift);
      claimedGifts.forEach((gift) => {
        dispatch({ type: "REMOVE", product: gift });
      });
    }
  }, [total, items, dispatch]);

  // --- HANDLERS ---
  const handleClaimGift = (gift) => {
    dispatch({ type: "ADD", product: { ...gift, quantity: 1 } });
  };

  const toggleVoucher = (v) => {
    if (appliedVoucher?.id === v.id) {
      setAppliedVoucher(null); // Un-apply if clicked again
    } else {
      setAppliedVoucher(v); // Apply new voucher
    }
  };

  const handleCheckoutClick = () => {
    // We pass the appliedVoucher to onCheckout so the modal can handle marking it as used
    onCheckout(appliedVoucher);
  };

  // --- EARLY RETURN ---
  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={styles.backdrop} />

      <div style={styles.drawer}>
        {/* HEADER */}
        <div
          style={{
            ...styles.header,
            borderBottom: items.length === 0 ? "1px solid #E5E7EB" : "none",
          }}
        >
          <div style={styles.headerTitleGroup}>
            <FiShoppingBag size={22} color={BRAND_BLUE} />
            <h2 style={styles.headerTitle}>
              ទំនិញរបស់អ្នក{" "}
              <span style={styles.headerCount}>({paidItemsCount})</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#E5E7EB")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#F3F4F6")
            }
          >
            <FiX size={20} />
          </button>
        </div>

        {/* FREE GIFT PROGRESS & CAROUSEL */}
        {items.length > 0 && (
          <div style={styles.giftSection}>
            <div style={styles.progressTextGroup}>
              <FiGift
                size={18}
                color={isFreeGiftUnlocked ? BRAND_GREEN : BRAND_BLUE}
              />
              {isFreeGiftUnlocked ? (
                <span style={{ color: BRAND_GREEN, animation: "fadeIn 0.5s" }}>
                  អ្នកទទួលបានកាដូឥតគិតថ្លៃហើយ! 🎉
                </span>
              ) : (
                <span style={{ color: "#4B5563" }}>
                  ទិញថែម{" "}
                  <span style={{ color: BRAND_BLUE }}>
                    {fmt(amountRemaining)}
                  </span>{" "}
                  ទៀតដើម្បីទទួលបានកាដូ!
                </span>
              )}
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercentage}%`,
                  backgroundColor: isFreeGiftUnlocked
                    ? BRAND_GREEN
                    : BRAND_BLUE,
                }}
              />
            </div>

            {!hasClaimedGift && (
              <div style={styles.carouselContainer}>
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {AVAILABLE_GIFTS.map((gift) => (
                  <div
                    key={gift.id}
                    style={{
                      ...styles.giftCard,
                      borderColor: isFreeGiftUnlocked ? BRAND_GREEN : "#E5E7EB",
                      opacity: isFreeGiftUnlocked ? 1 : 0.6,
                    }}
                  >
                    {!isFreeGiftUnlocked && (
                      <div style={styles.lockIcon}>
                        <FiLock size={12} color="#FFF" />
                      </div>
                    )}
                    <img
                      src={gift.image}
                      alt={gift.name}
                      style={styles.giftImage}
                    />
                    <div style={styles.giftName}>{gift.name}</div>
                    <button
                      onClick={() => handleClaimGift(gift)}
                      disabled={!isFreeGiftUnlocked}
                      style={{
                        ...styles.claimButton,
                        backgroundColor: isFreeGiftUnlocked
                          ? BRAND_GREEN
                          : "#F3F4F6",
                        color: isFreeGiftUnlocked ? "#FFF" : "#9CA3AF",
                        cursor: isFreeGiftUnlocked ? "pointer" : "not-allowed",
                      }}
                    >
                      {isFreeGiftUnlocked ? "Claim Free" : "Locked"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hasClaimedGift && (
              <div style={styles.claimedSuccess}>
                ✓ អ្នកបានជ្រើសរើសកាដូរបស់អ្នករួចរាល់ហើយ!
              </div>
            )}
          </div>
        )}

        {/* CART ITEMS */}
        <div style={styles.itemsScrollArea}>
          {items.length === 0 ? (
            <div style={styles.emptyCart}>
              <FiShoppingBag
                size={56}
                style={{ marginBottom: 16, opacity: 0.5 }}
              />
              <p style={{ fontSize: 16, fontWeight: 500 }}>
                Your cart is empty.
              </p>
            </div>
          ) : (
            <div style={{ paddingTop: 16 }}>
              {items.map((item) => (
                <CartItem key={item.id} item={item} dispatch={dispatch} />
              ))}
            </div>
          )}

          {/* --- VOUCHER SECTION --- */}
          {items.length > 0 && vouchers.length > 0 && (
            <div style={styles.vouchersContainer}>
              <div style={styles.vouchersHeader}>
                <FiTag size={16} color="#D91236" />
                <span>Your Rewards</span>
              </div>

              <div style={styles.vouchersList}>
                {vouchers.map((v) => {
                  const isSelected = appliedVoucher?.id === v.id;
                  const usdValue = v.discount_khr / 4000;

                  return (
                    <div
                      key={v.id}
                      onClick={() => toggleVoucher(v)}
                      style={{
                        ...styles.voucherItem,
                        borderColor: isSelected ? BRAND_GREEN : "#E5E7EB",
                        backgroundColor: isSelected ? "#ECFDF5" : "#FFF",
                      }}
                    >
                      <div style={styles.voucherInfo}>
                        <div style={styles.voucherValue}>
                          {v.discount_khr.toLocaleString()}៛ Discount
                        </div>
                        <div style={styles.voucherUsd}>
                          Save {fmt(usdValue)}
                        </div>
                      </div>
                      <div
                        style={{ color: isSelected ? BRAND_GREEN : "#D1D5DB" }}
                      >
                        <FiCheckCircle
                          size={20}
                          fill={isSelected ? BRAND_GREEN : "none"}
                          color={isSelected ? "#FFF" : "#D1D5DB"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER SUMMARY */}
        {items.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.summaryBox}>
              {/* Subtotal */}
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal</span>
                <span style={styles.summaryValue}>{fmt(total)}</span>
              </div>

              {/* Discount Line (Only visible if applied) */}
              {appliedVoucher && (
                <div style={styles.summaryRowDiscount}>
                  <span style={styles.summaryLabelDiscount}>
                    Voucher Discount
                  </span>
                  <span style={styles.summaryValueDiscount}>
                    -{fmt(discountUsd)}
                  </span>
                </div>
              )}

              <div style={styles.summaryDivider} />

              {/* Final Totals */}
              <div style={{ ...styles.summaryRow, marginBottom: 4 }}>
                <span style={styles.summaryLabelTotal}>សរុបទំនិញ (USD)</span>
                <span style={styles.summaryValueTotal}>
                  {fmt(finalTotalUsd)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabelKhr}>សរុបទំនិញ (KHR)</span>
                <span style={styles.summaryValueKhr}>
                  {fmtKHR(finalTotalUsd)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              style={styles.checkoutBtn}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(37, 99, 235, 0.25)`;
              }}
            >
              បន្តទៅបញ្ចប់ការបញ្ជាទិញ
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ==========================================
// EXTRACTED STYLES
// ==========================================
const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 2147483646,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    zIndex: 2147483647,
  },
  header: {
    padding: "24px 24px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleGroup: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" },
  headerCount: { color: "#6B7280", fontSize: 16, fontWeight: 500 },
  closeButton: {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    color: "#4B5563",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },

  // Free Gift
  giftSection: {
    padding: "0 24px 20px",
    borderBottom: "1px solid #E5E7EB",
    backgroundColor: "#ffffff",
  },
  progressTextGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 600,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    transition: "width 0.5s ease-in-out, background-color 0.5s ease-in-out",
  },
  carouselContainer: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 8,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  giftCard: {
    minWidth: 140,
    backgroundColor: "#FFF",
    border: "2px solid",
    borderRadius: 12,
    padding: 12,
    position: "relative",
    transition: "all 0.3s ease",
  },
  lockIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  giftImage: { width: 40, height: 40, objectFit: "contain", marginBottom: 8 },
  giftName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.2,
    marginBottom: 8,
  },
  claimButton: {
    width: "100%",
    padding: 6,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    transition: "all 0.2s ease",
  },
  claimedSuccess: {
    backgroundColor: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: 8,
    padding: 12,
    textAlign: "center",
    color: "#065F46",
    fontSize: 13,
    fontWeight: 500,
    animation: "fadeIn 0.3s ease-in-out",
  },

  // Items & Scroll Area
  itemsScrollArea: { flex: 1, overflowY: "auto", padding: "0 24px" },
  emptyCart: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#9CA3AF",
  },

  // Vouchers UI
  vouchersContainer: { marginTop: 24, marginBottom: 16 },
  vouchersHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 12,
  },
  vouchersList: { display: "flex", flexDirection: "column", gap: 10 },
  voucherItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    border: "2px solid",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  voucherInfo: { display: "flex", flexDirection: "column", gap: 2 },
  voucherValue: { fontSize: 14, fontWeight: 700, color: "#111827" },
  voucherUsd: { fontSize: 12, fontWeight: 500, color: "#6B7280" },

  // Footer Summary
  footer: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderTop: "1px solid #E5E7EB",
  },
  summaryBox: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, color: "#4B5563", fontWeight: 500 },
  summaryValue: { fontSize: 14, fontWeight: 600, color: "#111827" },

  summaryRowDiscount: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabelDiscount: { fontSize: 14, color: "#D91236", fontWeight: 600 },
  summaryValueDiscount: { fontSize: 14, fontWeight: 700, color: "#D91236" },

  summaryDivider: { borderTop: "1px solid #E5E7EB", margin: "12px 0" },

  summaryLabelTotal: { fontSize: 15, color: "#111827", fontWeight: 600 },
  summaryValueTotal: { fontSize: 18, fontWeight: 700, color: BRAND_BLUE },
  summaryLabelKhr: { fontSize: 13, color: "#6B7280" },
  summaryValueKhr: { fontSize: 13, fontWeight: 600, color: "#6B7280" },

  checkoutBtn: {
    width: "100%",
    padding: 16,
    backgroundColor: BRAND_BLUE,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: `0 4px 12px rgba(37, 99, 235, 0.25)`,
    transition: "transform 0.1s ease-in-out, box-shadow 0.1s",
  },
};
