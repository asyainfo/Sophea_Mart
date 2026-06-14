import { useState, useEffect, useRef } from "react";
import { FiPackage, FiShoppingBag, FiArrowLeft } from "react-icons/fi";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { fmt, fmtKHR } from "../utils/currency";
import OrderDetailsModal from "../components/order/OrderDetailsModal";
import Button from "../components/ui/Button";
import { Toast, useToast } from "../components/ui/Toast";

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toasts, show: toast } = useToast();

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // --- NEW: Audio Reference for Mobile ---
  const audioRef = useRef(null);

  // --- DATA FETCHING ---
  const fetchMyOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Load
  useEffect(() => {
    if (user) {
      fetchMyOrders();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- MOBILE AUDIO UNLOCKER ---
  // This plays and pauses the audio silently on the first screen tap so iOS/Android trusts it
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch((err) => console.log("Unlock pending...", err));
      }
      // Remove listeners once unlocked so it only happens once
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("touchstart", unlockAudio);
    document.addEventListener("click", unlockAudio);

    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // --- SUPABASE REALTIME LISTENER ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Orders",
          filter: `user_id=eq.${user.id}`, // Only listen to THIS user's orders
        },
        (payload) => {
          console.log("Customer Order Updated Realtime:", payload.new);

          // If Admin marked order as "completed"
          if (payload.new.status === "completed") {
            toast(
              `🎉 Good news! Order ${payload.new.id} is ready for pick-up!`,
              "success",
            );

            // Play the trusted mobile audio element!
            if (audioRef.current) {
              audioRef.current.currentTime = 0; // Reset to beginning
              audioRef.current
                .play()
                .catch((e) =>
                  console.warn(
                    "Mobile browser still blocked audio. Ensure you tap the screen first.",
                    e,
                  ),
                );
            }
          }

          // Refresh orders to update UI badges
          fetchMyOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]);

  // --- RENDER: UN-AUTHENTICATED STATE ---
  if (!loading && !user) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <FiShoppingBag
          size={48}
          color="#9CA3AF"
          style={{ margin: "0 auto 20px" }}
        />
        <h2>Please Sign In</h2>
        <p style={{ color: "#6B7280" }}>
          You need to be logged in to view your order history.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Return to Store
        </Button>
      </div>
    );
  }

  // --- RENDER: AUTHENTICATED STATE ---
  return (
    <div
      style={{ minHeight: "100vh", background: "#f9fafb", paddingBottom: 60 }}
    >
      {/* Header Area */}
      <div
        style={{ background: "#0066FF", padding: "40px 20px", color: "white" }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <FiArrowLeft /> Back to Store
          </button>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FiPackage /> My Orders
          </h1>
          <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
            Track and manage your past purchases.
          </p>
        </div>
      </div>

      {/* Orders List Container */}
      <div style={{ maxWidth: 800, margin: "-20px auto 0", padding: "0 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div
            style={{
              background: "white",
              padding: 60,
              borderRadius: 16,
              textAlign: "center",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            <FiShoppingBag
              size={48}
              color="#E5E7EB"
              style={{ margin: "0 auto 16px" }}
            />
            <h3 style={{ margin: "0 0 8px" }}>No orders yet</h3>
            <p style={{ color: "#6B7280", margin: "0 0 24px" }}>
              Looks like you haven't made any purchases.
            </p>
            <Button onClick={() => (window.location.href = "/")}>
              Start Shopping
            </Button>
          </div>
        ) : (
          /* Populated List */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  border: "1px solid #F3F4F6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ margin: 0, color: "#111827" }}>{order.id}</h3>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          order.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                        color:
                          order.status === "completed" ? "#065F46" : "#92400E",
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div style={{ color: "#6B7280", fontSize: 14 }}>
                    {new Date(order.created_at).toLocaleDateString()} •{" "}
                    {order.total_items} items
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#2563EB",
                      }}
                    >
                      {fmt(order.total_usd)}
                    </div>
                    <div style={{ fontSize: 13, color: "#9CA3AF" }}>
                      {fmtKHR(order.total_usd)}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setShowOrderModal(true);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS & ALERTS --- */}
      {selectedOrderId && (
        <OrderDetailsModal
          open={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
        />
      )}

      <Toast toasts={toasts} />

      {/* Hidden Mobile Audio Player */}
      <audio
        ref={audioRef}
        src="/customer-alert.mp3"
        preload="auto"
        style={{ display: "none" }}
      />
    </div>
  );
}
