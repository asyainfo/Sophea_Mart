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

// --- CONFIGURATION ---
const FREE_GIFT_THRESHOLD = 15;
const BRAND_BLUE = "#2563EB";
const BRAND_GREEN = "#10B981";

// 🏆 FIX 1: Using local image paths!
// Just drop your images into your "public/images" folder.
const AVAILABLE_GIFTS = [
  {
    id: "gift-1",
    name: "Toys",
    price: 0,
    isGift: true,
    image: "public/babys/B008.jpg",
  },
  {
    id: "gift-2",
    name: "នំដំឡូង សារាយ",
    price: 0,
    isGift: true,
    image: "public/snacks/S008.jpeg",
  },
  {
    id: "gift-3",
    name: "គ្រាប់ចន្ទី",
    price: 0,
    isGift: true,
    image: "public/snacks/S009.webp",
  },
  {
    id: "gift-4",
    name: "នំថងមួង",
    price: 0,
    isGift: true,
    image: "public/images/T003.jpg",
  },
  {
    id: "gift-5",
    name: "ដំណាប់ស្វាយ",
    price: 0,
    isGift: true,
    image: "public/images/T001.png",
  },
];

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  const [vouchers, setVouchers] = useState([]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // --- DERIVED STATE ---
  const progressPercentage = Math.min((total / FREE_GIFT_THRESHOLD) * 100, 100);
  const amountRemaining = Math.max(FREE_GIFT_THRESHOLD - total, 0);
  const isFreeGiftUnlocked = total >= FREE_GIFT_THRESHOLD;
  const claimedGiftId = items.find((item) => item.isGift)?.id;

  // 🏆 FIX 2: Correctly counts TOTAL quantity of items, not just the rows!
  const paidItemsCount = items
    .filter((item) => !item.isGift)
    .reduce((sum, item) => sum + (item.quantity || 1), 0);

  const discountUsd = appliedVoucher ? appliedVoucher.discount_khr / 4000 : 0;
  const finalTotalUsd = Math.max(total - discountUsd, 0);

  // --- EFFECTS ---
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

  // Auto-remove gift if total drops below threshold
  useEffect(() => {
    if (total < FREE_GIFT_THRESHOLD && claimedGiftId) {
      const claimedGift = items.find((item) => item.id === claimedGiftId);
      if (claimedGift) {
        dispatch({ type: "REMOVE", product: claimedGift });
      }
    }
  }, [total, items, dispatch, claimedGiftId]);

  // --- HANDLERS ---
  const handleClaimGift = (gift) => {
    // Remove old gift first (so they can't spam multi-gifts)
    if (claimedGiftId) {
      const oldGift = items.find((item) => item.id === claimedGiftId);
      dispatch({ type: "REMOVE", product: oldGift });
    }
    dispatch({ type: "ADD", product: { ...gift, quantity: 1 } });
  };

  const toggleVoucher = (v) => {
    setAppliedVoucher(appliedVoucher?.id === v.id ? null : v);
  };

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
          <button onClick={onClose} style={styles.closeButton}>
            <FiX size={20} />
          </button>
        </div>

        {/* FREE GIFT CAROUSEL */}
        {items.length > 0 && (
          <div style={styles.giftSection}>
            <div style={styles.progressTextGroup}>
              <FiGift
                size={18}
                color={isFreeGiftUnlocked ? BRAND_GREEN : BRAND_BLUE}
              />
              {isFreeGiftUnlocked ? (
                <span style={{ color: BRAND_GREEN, fontWeight: 700 }}>
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

            <div style={styles.carouselContainer}>
              {/* 🏆 FIX 3: Force hiding the scrollbar */}
              <style>{`
                .hide-scroll::-webkit-scrollbar { display: none !important; }
              `}</style>

              <div className="hide-scroll" style={styles.carouselTrack}>
                {AVAILABLE_GIFTS.map((gift) => {
                  const isSelected = claimedGiftId === gift.id;

                  return (
                    <div
                      key={gift.id}
                      onClick={() =>
                        isFreeGiftUnlocked && handleClaimGift(gift)
                      }
                      style={{
                        ...styles.giftCard,
                        borderColor: isSelected
                          ? BRAND_BLUE
                          : isFreeGiftUnlocked
                            ? "#E5E7EB"
                            : "#F3F4F6",
                        backgroundColor: isSelected ? "#EFF6FF" : "#FFF",
                        opacity: isFreeGiftUnlocked ? 1 : 0.6,
                        filter: isFreeGiftUnlocked ? "none" : "grayscale(100%)",
                        cursor: isFreeGiftUnlocked ? "pointer" : "not-allowed",
                      }}
                    >
                      {/* Locked Overlay */}
                      {!isFreeGiftUnlocked && (
                        <div style={styles.lockIcon}>
                          <FiLock size={12} color="#FFF" />
                        </div>
                      )}

                      {/* Selected Overlay */}
                      {isSelected && (
                        <div style={styles.selectedIcon}>
                          <FiCheckCircle size={14} color="#FFF" />
                        </div>
                      )}

                      {/* We added a fallback icon in case your local images aren't added yet */}
                      {gift.image ? (
                        <img
                          src={gift.image}
                          alt={gift.name}
                          style={styles.giftImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "/Users/macbookpro/Desktop/mart-web/public"; // fallback
                          }}
                        />
                      ) : null}

                      <div
                        style={{
                          ...styles.giftName,
                          color: isSelected ? BRAND_BLUE : "#111827",
                        }}
                      >
                        {gift.name}
                      </div>

                      <button
                        disabled={!isFreeGiftUnlocked}
                        style={{
                          ...styles.claimButton,
                          backgroundColor: isSelected
                            ? BRAND_BLUE
                            : isFreeGiftUnlocked
                              ? BRAND_GREEN
                              : "#E5E7EB",
                          color: isFreeGiftUnlocked ? "#FFF" : "#9CA3AF",
                        }}
                      >
                        {isSelected
                          ? "Selected"
                          : isFreeGiftUnlocked
                            ? "Choose Gift"
                            : "Locked"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CART ITEMS & VOUCHERS */}
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

          {/* Vouchers */}
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
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Subtotal</span>
                <span style={styles.summaryValue}>{fmt(total)}</span>
              </div>
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
              onClick={() => onCheckout(appliedVoucher)}
              style={styles.checkoutBtn}
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
// STYLES
// ==========================================
const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17,24,39,0.6)",
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
    backgroundColor: "#fff",
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
  },

  giftSection: {
    padding: "0 24px 20px",
    borderBottom: "1px solid #E5E7EB",
    backgroundColor: "#fff",
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
    transition: "width 0.5s ease, background-color 0.5s ease",
  },

  carouselContainer: { position: "relative", width: "100%" },
  carouselTrack: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    paddingBottom: 16,
    paddingTop: 4, // 🏆 Fix for cut-off icons
    scrollbarWidth: "none", // Firefox hide scrollbar
    msOverflowStyle: "none", // IE hide scrollbar
  },
  giftCard: {
    minWidth: 130,
    flex: "0 0 auto",
    scrollSnapAlign: "start",
    border: "2px solid",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative",
    transition: "all 0.3s ease",
  },

  // 🏆 FIX 4: Moved the icons inside the borders so they never get chopped off!
  lockIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#9CA3AF",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  selectedIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: BRAND_BLUE,
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  giftImage: { width: 48, height: 48, objectFit: "contain", marginBottom: 10 },
  giftName: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 12,
    flex: 1,
    display: "flex",
    alignItems: "center",
  },
  claimButton: {
    width: "100%",
    padding: "6px 0",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    transition: "all 0.2s ease",
  },

  itemsScrollArea: { flex: 1, overflowY: "auto", padding: "0 24px" },
  emptyCart: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#9CA3AF",
  },
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
  },
  voucherInfo: { display: "flex", flexDirection: "column", gap: 2 },
  voucherValue: { fontSize: 14, fontWeight: 700, color: "#111827" },
  voucherUsd: { fontSize: 12, fontWeight: 500, color: "#6B7280" },

  footer: {
    padding: 24,
    backgroundColor: "#fff",
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
    color: "#FFF",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
};
