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
import { useTranslation } from "react-i18next";

// --- CONFIGURATION ---
const FREE_GIFT_THRESHOLD = 15;
const BRAND_BLUE = "#2563EB";
const BRAND_GREEN = "#10B981";

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  const { t } = useTranslation();
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  const [vouchers, setVouchers] = useState([]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Settings & DB Gifts State
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [availableGifts, setAvailableGifts] = useState([]);

  // --- DERIVED STATE ---
  const progressPercentage = Math.min((total / FREE_GIFT_THRESHOLD) * 100, 100);
  const amountRemaining = Math.max(FREE_GIFT_THRESHOLD - total, 0);
  const isFreeGiftUnlocked = total >= FREE_GIFT_THRESHOLD;

  const claimedGiftId = items.find((item) => item.isGift)?.id;

  const paidItemsCount = items
    .filter((item) => !item.isGift)
    .reduce((sum, item) => sum + (item.quantity || 1), 0);

  const discountUsd = appliedVoucher ? appliedVoucher.discount_khr / 4000 : 0;
  const finalTotalUsd = Math.max(total - discountUsd, 0);

  // --- EFFECTS ---
  useEffect(() => {
    async function fetchPromotionsData() {
      if (!isOpen) return;
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("store_settings")
          .select("setting_value")
          .eq("setting_key", "enable_promotions")
          .single();

        if (!settingsError && settingsData) {
          setPromotionsEnabled(settingsData.setting_value);

          if (settingsData.setting_value) {
            const { data: giftsData, error: giftsError } = await supabase
              .from("free_gifts")
              .select("*")
              .order("created_at", { ascending: true });

            if (!giftsError && giftsData) {
              const formattedGifts = giftsData.map((gift) => ({
                id: gift.id,
                name: gift.name,
                price: 0,
                isGift: true,
                image: gift.image_url,
              }));
              setAvailableGifts(formattedGifts);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching promotions data:", err);
      }
    }
    fetchPromotionsData();
  }, [isOpen]);

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

  useEffect(() => {
    if ((total < FREE_GIFT_THRESHOLD || !promotionsEnabled) && claimedGiftId) {
      const claimedGift = items.find((item) => item.id === claimedGiftId);
      if (claimedGift) {
        dispatch({ type: "REMOVE", product: claimedGift });
      }
    }
  }, [total, items, dispatch, claimedGiftId, promotionsEnabled]);

  // --- HANDLERS ---
  const handleClaimGift = (gift) => {
    const isCurrentlySelected = claimedGiftId === gift.id;

    if (isCurrentlySelected) {
      const giftToRemove = items.find((item) => item.id === gift.id);
      if (giftToRemove) {
        dispatch({ type: "REMOVE", product: giftToRemove });
      }
    } else if (!claimedGiftId) {
      dispatch({
        type: "ADD",
        product: { ...gift, quantity: 1, isGift: true },
      });
    }
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
              {/* 🏆 Translated Text */}
              {t("cart.your_cart", "Your Cart")}{" "}
              <span style={styles.headerCount}>({paidItemsCount})</span>
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <FiX size={20} />
          </button>
        </div>

        {/* FREE GIFT CAROUSEL */}
        {promotionsEnabled && items.length > 0 && availableGifts.length > 0 && (
          <div style={styles.giftSection}>
            <div style={styles.progressTextGroup}>
              <FiGift
                size={18}
                color={isFreeGiftUnlocked ? BRAND_GREEN : BRAND_BLUE}
              />
              {isFreeGiftUnlocked ? (
                <span
                  style={{ color: BRAND_GREEN, fontWeight: 700, fontSize: 13 }}
                >
                  {/* 🏆 Translated Text */}
                  {t(
                    "cart.free_gift_unlocked",
                    "You've unlocked a free gift! 🎉",
                  )}
                </span>
              ) : (
                <span style={{ color: "#4B5563", fontSize: 13 }}>
                  {/* 🏆 Translated Text */}
                  {t("cart.add_more", "Add")}{" "}
                  <span style={{ color: BRAND_BLUE, fontWeight: 700 }}>
                    {fmt(amountRemaining)}
                  </span>{" "}
                  {t("cart.to_get_gift", "more to get a free gift!")}
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
              <style>{`
                .hide-scroll::-webkit-scrollbar { display: none !important; }
              `}</style>

              <div className="hide-scroll" style={styles.carouselTrack}>
                {availableGifts.map((gift) => {
                  const isSelected = claimedGiftId === gift.id;
                  const isLockedOut = claimedGiftId && !isSelected;
                  const isDisabled = !isFreeGiftUnlocked || isLockedOut;

                  return (
                    <button
                      key={gift.id}
                      onClick={() => !isDisabled && handleClaimGift(gift)}
                      disabled={isDisabled}
                      style={{
                        ...styles.compactGiftCard,
                        borderColor: isSelected
                          ? BRAND_BLUE
                          : !isDisabled
                            ? "#E5E7EB"
                            : "#F3F4F6",
                        backgroundColor: isSelected ? "#EFF6FF" : "#FFF",
                        opacity: !isDisabled || isSelected ? 1 : 0.4,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {!isFreeGiftUnlocked && (
                        <div style={styles.compactLockIcon}>
                          <FiLock size={10} color="#FFF" />
                        </div>
                      )}

                      {isSelected && (
                        <div style={styles.compactSelectedIcon}>
                          <FiCheckCircle size={12} color="#FFF" />
                        </div>
                      )}

                      {gift.image ? (
                        <img
                          src={gift.image}
                          alt={gift.name}
                          style={styles.compactGiftImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/Sophea Mart no1.png";
                          }}
                        />
                      ) : (
                        <div style={styles.compactPlaceholder}>
                          <FiGift color="#9CA3AF" size={16} />
                        </div>
                      )}

                      <div
                        style={{
                          ...styles.compactGiftName,
                          color: isSelected ? BRAND_BLUE : "#111827",
                        }}
                      >
                        {gift.name}
                      </div>
                    </button>
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
                {/* 🏆 Translated Text */}
                {t("cart.empty_cart", "Your cart is empty.")}
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
                {/* 🏆 Translated Text */}
                <span>{t("cart.your_rewards", "Your Rewards")}</span>
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
                          {v.discount_khr.toLocaleString()}៛{" "}
                          {t("cart.discount", "Discount")}
                        </div>
                        <div style={styles.voucherUsd}>
                          {t("cart.save", "Save")} {fmt(usdValue)}
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
                {/* 🏆 Translated Text */}
                <span style={styles.summaryLabel}>
                  {t("cart.subtotal", "Subtotal")}
                </span>
                <span style={styles.summaryValue}>{fmt(total)}</span>
              </div>
              {appliedVoucher && (
                <div style={styles.summaryRowDiscount}>
                  {/* 🏆 Translated Text */}
                  <span style={styles.summaryLabelDiscount}>
                    {t("cart.voucher_discount", "Voucher Discount")}
                  </span>
                  <span style={styles.summaryValueDiscount}>
                    -{fmt(discountUsd)}
                  </span>
                </div>
              )}
              <div style={styles.summaryDivider} />
              <div style={{ ...styles.summaryRow, marginBottom: 4 }}>
                {/* 🏆 Translated Text */}
                <span style={styles.summaryLabelTotal}>
                  {t("cart.total_usd", "Total (USD)")}
                </span>
                <span style={styles.summaryValueTotal}>
                  {fmt(finalTotalUsd)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                {/* 🏆 Translated Text */}
                <span style={styles.summaryLabelKhr}>
                  {t("cart.total_khr", "Total (KHR)")}
                </span>
                <span style={styles.summaryValueKhr}>
                  {fmtKHR(finalTotalUsd)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onCheckout(appliedVoucher)}
              style={styles.checkoutBtn}
            >
              {/* 🏆 Translated Text */}
              {t("cart.checkout", "Proceed to Checkout")}
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
    padding: "20px 24px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleGroup: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" },
  headerCount: { color: "#6B7280", fontSize: 15, fontWeight: 500 },
  closeButton: {
    width: 32,
    height: 32,
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
    padding: "0 24px 16px",
    borderBottom: "1px solid #E5E7EB",
    backgroundColor: "#fff",
  },
  progressTextGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    fontWeight: 600,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    transition: "width 0.5s ease, background-color 0.5s ease",
  },

  carouselContainer: { position: "relative", width: "100%" },
  carouselTrack: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 6,
    paddingTop: 4,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },

  compactGiftCard: {
    minWidth: 84,
    maxWidth: 100,
    flex: "0 0 auto",
    border: "2px solid",
    borderRadius: 10,
    padding: "8px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    transition: "all 0.2s ease",
  },
  compactGiftImage: {
    width: 36,
    height: 36,
    objectFit: "contain",
    marginBottom: 6,
  },
  compactPlaceholder: {
    width: 36,
    height: 36,
    marginBottom: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  compactGiftName: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.2,
    width: "100%",
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  compactLockIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#9CA3AF",
    borderRadius: "50%",
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  compactSelectedIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: BRAND_BLUE,
    borderRadius: "50%",
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
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
