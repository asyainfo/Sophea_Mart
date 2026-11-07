import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

const adminSound =
  typeof Audio !== "undefined" ? new Audio("/admin-alert.wav") : null;
if (adminSound) adminSound.preload = "none";

const customerSound =
  typeof Audio !== "undefined" ? new Audio("/customer-alert.mp3") : null;
if (customerSound) customerSound.preload = "none";

const triggerGlobalToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

// Centralized helper to play sound safely
const playSound = (audioElement) => {
  if (!audioElement) return;
  audioElement.currentTime = 0;
  audioElement
    .play()
    .catch((err) => console.warn("Audio blocked by browser:", err));
};

export default function GlobalAudioAlerts() {
  const { user, profile } = useAuth();
  const notifiedOrders = useRef(new Set());
  const unlockedRoleRef = useRef(null);

  const userId = user?.id ?? null;
  const isProfileReady = Boolean(userId && profile?.id === userId);
  const userRole = isProfileReady ? profile?.role : null;
  const isStaff = userRole === "admin" || userRole === "cashier";

  // 1. Role-Specific Audio Unlocker (Only unlocks the 1 sound needed for the logged-in user)
  useEffect(() => {
    if (!isProfileReady) return;

    const targetRole = isStaff ? "staff" : "customer";
    if (unlockedRoleRef.current === targetRole) return;

    const targetAudio = isStaff ? adminSound : customerSound;
    if (!targetAudio) return;

    const unlockAudio = () => {
      if (unlockedRoleRef.current === targetRole) return;
      unlockedRoleRef.current = targetRole;

      targetAudio.muted = true;
      targetAudio
        .play()
        .then(() => {
          targetAudio.pause();
          targetAudio.currentTime = 0;
          targetAudio.muted = false;
        })
        .catch(() => {
          targetAudio.muted = false;
        });

      cleanupListeners();
    };

    const events = ["click", "touchstart", "keydown"];
    const cleanupListeners = () => {
      events.forEach((event) =>
        document.removeEventListener(event, unlockAudio),
      );
    };

    events.forEach((event) =>
      document.addEventListener(event, unlockAudio, {
        once: true,
        passive: true,
      }),
    );

    return cleanupListeners;
  }, [isProfileReady, isStaff]);

  // 2. Supabase Realtime Subscriptions (Depends only on stable primitive values)
  useEffect(() => {
    notifiedOrders.current.clear();

    if (!userId || !isProfileReady) return;

    let activeChannel;

    if (isStaff) {
      // --- STAFF SUBSCRIPTION (Admins & Cashiers) ---
      activeChannel = supabase
        .channel(`global-staff-listener-${userId}`)
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

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [userId, isProfileReady, isStaff]);

  return null;
}
