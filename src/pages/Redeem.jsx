import { useState, useEffect } from "react";
import { FiClock, FiGift, FiAward, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";

// --- CONSTANTS ---
const VOUCHERS = [
  { id: 1, cost: 200, valueKhr: 5000, title: "Membership Voucher 5,000 Riel" },
  {
    id: 2,
    cost: 800,
    valueKhr: 20000,
    title: "Membership Voucher 20,000 Riel",
  },
  {
    id: 3,
    cost: 2000,
    valueKhr: 50000,
    title: "Membership Voucher 50,000 Riel",
  },
];

const BRAND_BLUE = "#2563EB";
const BRAND_BLUE_LIGHT = "#60A5FA";

export default function Redeem() {
  const { user } = useAuth();

  // State
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    async function fetchPoints() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        setPoints(data?.points || 0);
      } catch (error) {
        console.error("Error fetching points:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPoints();
  }, [user]);

  // --- HANDLERS ---
  const handleRedeem = async (voucher) => {
    if (points < voucher.cost) {
      alert(
        `You need ${voucher.cost - points} more points to redeem this voucher!`,
      );
      return;
    }

    const confirmRedeem = window.confirm(
      `Redeem ${voucher.cost} points for ${voucher.title}?`,
    );
    if (!confirmRedeem) return;

    setIsRedeeming(true);
    try {
      const newPointBalance = points - voucher.cost;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ points: newPointBalance })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: voucherError } = await supabase
        .from("user_vouchers")
        .insert([
          {
            user_id: user.id,
            discount_khr: voucher.valueKhr,
            is_used: false,
          },
        ]);

      if (voucherError) throw voucherError;

      setPoints(newPointBalance);
      alert(
        "🎉 Voucher successfully redeemed! It has been added to your wallet.",
      );
    } catch (error) {
      console.error("Error redeeming voucher:", error);
      alert("Failed to redeem voucher. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setIsLoadingHistory(true);

    try {
      const { data: orders } = await supabase
        .from("Orders")
        .select("id, created_at, total_usd")
        .eq("user_id", user.id);

      const { data: vouchers } = await supabase
        .from("user_vouchers")
        .select("id, created_at, discount_khr")
        .eq("user_id", user.id);

      const timeline = [];

      if (orders) {
        orders.forEach((order) => {
          const earned = Math.floor(order.total_usd / 1.25);
          if (earned > 0) {
            timeline.push({
              id: `order-${order.id}`,
              date: new Date(order.created_at),
              title: `Order ${order.id}`,
              amount: `+${earned}`,
              type: "earn",
            });
          }
        });
      }

      if (vouchers) {
        vouchers.forEach((voucher) => {
          let spent = 0;
          if (voucher.discount_khr === 5000) spent = 200;
          if (voucher.discount_khr === 20000) spent = 800;
          if (voucher.discount_khr === 50000) spent = 2000;

          timeline.push({
            id: `voucher-${voucher.id}`,
            date: new Date(voucher.created_at),
            title: `Redeemed ${voucher.discount_khr.toLocaleString()}៛ Voucher`,
            amount: `-${spent}`,
            type: "spend",
          });
        });
      }

      timeline.sort((a, b) => b.date - a.date);
      setHistoryData(timeline);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Redeem</h1>
      </div>

      <div style={styles.contentContainer}>
        {/* HERO CARD */}
        <div style={styles.heroCard}>
          <FiAward
            size={120}
            color="rgba(255,255,255,0.1)"
            style={styles.heroIcon}
          />
          <div style={styles.heroLabel}>You have</div>
          <div style={styles.heroPointsContainer}>
            {isLoading ? "..." : points}{" "}
            <span style={styles.heroPointsLabel}>points</span>
          </div>
          <button
            onClick={handleOpenHistory}
            style={styles.historyButton}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <FiClock size={16} /> Point history
          </button>
        </div>

        {/* REWARDS LIST */}
        <h2 style={styles.rewardsSectionTitle}>Available rewards</h2>
        <div style={styles.vouchersList}>
          {VOUCHERS.map((voucher) => {
            const canAfford = points >= voucher.cost;

            return (
              <div
                key={voucher.id}
                onClick={() => !isRedeeming && handleRedeem(voucher)}
                style={{
                  ...styles.voucherCard,
                  cursor: canAfford && !isRedeeming ? "pointer" : "not-allowed",
                  opacity: canAfford ? 1 : 0.6,
                }}
                onMouseOver={(e) => {
                  if (canAfford)
                    e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  if (canAfford)
                    e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* TICKET LEFT (Blue Block) */}
                <div style={styles.ticketLeft}>
                  <div style={styles.ticketLeftInner}>
                    <div style={styles.ticketLabel}>
                      MEMBERSHIP
                      <br />
                      VOUCHER
                    </div>
                    <div style={styles.ticketCircle}>
                      {voucher.valueKhr.toLocaleString()}៛
                    </div>
                  </div>
                </div>

                {/* TICKET MIDDLE (Title) */}
                <div style={styles.ticketMiddle}>{voucher.title}</div>

                {/* TICKET RIGHT (Points Required) */}
                <div style={styles.ticketRight}>
                  <span style={styles.ticketCost}>
                    {voucher.cost.toLocaleString()}
                  </span>
                  <span style={styles.ticketCostLabel}>points required</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HISTORY MODAL OVERLAY */}
      {historyOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Point History</h3>
              <button
                onClick={() => setHistoryOpen(false)}
                style={styles.modalCloseButton}
              >
                <FiX size={24} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {isLoadingHistory ? (
                <div style={styles.emptyState}>Loading history...</div>
              ) : historyData.length === 0 ? (
                <div style={styles.emptyState}>
                  <FiClock
                    size={48}
                    style={{ opacity: 0.2, marginBottom: 12 }}
                  />
                  <p>No point history found.</p>
                </div>
              ) : (
                <div style={styles.historyList}>
                  {historyData.map((item) => (
                    <div key={item.id} style={styles.historyItem}>
                      <div>
                        <div style={styles.historyItemTitle}>{item.title}</div>
                        <div style={styles.historyItemDate}>
                          {item.date.toLocaleDateString()} at{" "}
                          {item.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div
                        style={{
                          ...styles.historyItemAmount,
                          color: item.type === "earn" ? "#10B981" : "#EF4444",
                          background:
                            item.type === "earn" ? "#ECFDF5" : "#FEF2F2",
                        }}
                      >
                        {item.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    paddingBottom: 40,
    position: "relative",
  },
  header: {
    backgroundColor: BRAND_BLUE,
    padding: "20px",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
  contentContainer: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "20px",
  },
  heroCard: {
    background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #1D4ED8 100%)`,
    borderRadius: 16,
    padding: 24,
    color: "#FFF",
    boxShadow: `0 10px 25px rgba(37, 99, 235, 0.2)`,
    marginBottom: 32,
    position: "relative",
    overflow: "hidden",
  },
  heroIcon: {
    position: "absolute",
    right: -20,
    top: -20,
  },
  heroLabel: {
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 8,
  },
  heroPointsContainer: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 24,
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  heroPointsLabel: {
    fontSize: 18,
    fontWeight: 500,
    opacity: 0.9,
  },
  historyButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: 8,
    color: "#FFF",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.2s",
  },
  rewardsSectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: BRAND_BLUE,
    marginBottom: 16,
  },
  vouchersList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  voucherCard: {
    display: "flex",
    backgroundColor: "#FFF",
    borderRadius: 12,
    border: `1px solid ${BRAND_BLUE_LIGHT}`,
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  ticketLeft: {
    backgroundColor: BRAND_BLUE_LIGHT,
    width: "35%",
    padding: "12px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ticketLeftInner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  ticketLabel: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
    width: 80, // Expanded width to fit the text perfectly
  },
  ticketCircle: {
    backgroundColor: "#FFF",
    color: BRAND_BLUE,
    borderRadius: "50%",
    width: 50,
    height: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    flexShrink: 0,
  },
  ticketMiddle: {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    borderRight: `1.5px dashed ${BRAND_BLUE_LIGHT}`,
  },
  ticketRight: {
    width: "25%",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: BRAND_BLUE,
    textAlign: "center",
  },
  ticketCost: {
    fontSize: 18,
    fontWeight: 800,
  },
  ticketCostLabel: {
    fontSize: 11,
    fontWeight: 500,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  modalCloseButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6B7280",
  },
  modalBody: {
    padding: "16px 24px",
    overflowY: "auto",
    flex: 1,
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#6B7280",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottom: "1px solid #F3F4F6",
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  historyItemAmount: {
    fontSize: 16,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 8,
  },
};
