import { useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

const adminSound = new Audio("/admin-alert.wav");
const customerSound = new Audio("/customer-alert.mp3");
let isAudioUnlocked = false;

// We trigger a global browser event instead of relying on React state props!
const triggerGlobalToast = (message, type) => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

export default function GlobalAudioAlerts() {
  const { user, profile } = useAuth();

  // Safe Audio Unlocker
  useEffect(() => {
    const unlockAudio = () => {
      if (isAudioUnlocked) return;

      adminSound.volume = 0;
      customerSound.volume = 0;

      adminSound
        .play()
        .then(() => {
          adminSound.pause();
          adminSound.currentTime = 0;
          adminSound.volume = 1;
        })
        .catch(() => {
          adminSound.volume = 1;
        });

      customerSound
        .play()
        .then(() => {
          customerSound.pause();
          customerSound.currentTime = 0;
          customerSound.volume = 1;
        })
        .catch(() => {
          customerSound.volume = 1;
        });

      isAudioUnlocked = true;
    };

    const events = ["click", "touchstart"];
    events.forEach((e) =>
      document.addEventListener(e, unlockAudio, { once: true }),
    );
    return () =>
      events.forEach((e) => document.removeEventListener(e, unlockAudio));
  }, []);

  // Supabase Realtime Subscriptions
  useEffect(() => {
    if (!user) return;
    let activeChannel;

    const handleAdminAlert = (payload) => {
      triggerGlobalToast(
        `🚨 New Order Received! ID: ${payload.new.id}`,
        "success",
      );
      adminSound.currentTime = 0;
      adminSound.play().catch((e) => console.warn("Admin audio blocked", e));
    };

    const handleCustomerAlert = (payload) => {
      if (payload.new?.status === "completed") {
        triggerGlobalToast(
          `🎉 Good news! Order ${payload.new.id} is ready for pick-up!`,
          "success",
        );
        customerSound.currentTime = 0;
        customerSound
          .play()
          .catch((e) => console.warn("Customer audio blocked", e));
      }
    };

    if (profile?.role === "admin") {
      activeChannel = supabase
        .channel("global-admin-listener")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Orders" },
          handleAdminAlert,
        )
        .subscribe();
    } else {
      activeChannel = supabase
        .channel(`global-customer-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Orders",
            filter: `user_id=eq.${user.id}`,
          },
          handleCustomerAlert,
        )
        .subscribe();
    }

    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [user, profile]);

  return null;
}
