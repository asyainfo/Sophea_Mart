import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

const adminSound = new Audio("/admin-alert.wav");
adminSound.preload = "none";

const customerSound = new Audio("/customer-alert.mp3");
customerSound.preload = "none";

let isAudioUnlocked = false;

const triggerGlobalToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

// Centralized helper to play sound safely
const playSound = (audioElement) => {
  audioElement.currentTime = 0;
  audioElement
    .play()
    .catch((err) => console.warn("Audio blocked by browser:", err));
};

export default function GlobalAudioAlerts() {
  const { user, profile } = useAuth();
  const notifiedOrders = useRef(new Set());

  const userId = user?.id;
  const userRole = profile?.role;
  const isStaff = userRole === "admin" || userRole === "cashier";

  // 1. Safe Audio Unlocker
  useEffect(() => {
    const unlockAudio = () => {
      if (isAudioUnlocked) return;

      adminSound.muted = true;
      customerSound.muted = true;

      Promise.all([
        adminSound.play().catch(() => {}),
        customerSound.play().catch(() => {}),
      ]).then(() => {
        adminSound.pause();
        adminSound.currentTime = 0;
        adminSound.muted = false;

        customerSound.pause();
        customerSound.currentTime = 0;
        customerSound.muted = false;
      });

      isAudioUnlocked = true;
    };

    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) =>
      document.addEventListener(event, unlockAudio, {
        once: true,
        passive: true,
      }),
    );

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, unlockAudio),
      );
    };
  }, []);

  // 2. Supabase Realtime Subscriptions
  useEffect(() => {
    // Wait until both userId and profile role are loaded to avoid double-connecting
    if (!userId || !profile) return;

    let activeChannel;

    if (isStaff) {
      // --- STAFF SUBSCRIPTION (Admins & Cashiers) ---
      activeChannel = supabase
        .channel("global-staff-listener")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Orders" },
          (payload) => {
            const orderId = payload.new?.id;
            if (orderId && !notifiedOrders.current.has(orderId)) {
              notifiedOrders.current.add(orderId);
              triggerGlobalToast(`🚨 New Order Received! ID: ${orderId}`);
              playSound(adminSound);
            }
          },
        )
        .subscribe();
    } else {
      // --- CUSTOMER SUBSCRIPTION ---
      activeChannel = supabase
        .channel(`global-customer-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Orders",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const orderId = payload.new?.id;
            const status = payload.new?.status;

            // Strict check: Status must be completed AND not already notified
            if (
              orderId &&
              status === "completed" &&
              !notifiedOrders.current.has(orderId)
            ) {
              notifiedOrders.current.add(orderId);

              triggerGlobalToast(
                `🎉 Good news! Order ${orderId} is ready for pick-up!`,
              );
              playSound(customerSound);
            }
          },
        )
        .subscribe();
    }

    // Cleanup function when user logs out or role changes
    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [userId, profile, isStaff]);

  return null;
}
