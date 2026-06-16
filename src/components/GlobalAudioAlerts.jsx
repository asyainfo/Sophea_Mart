import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./ui/Toast";

// Audio instances kept outside the component lifecycle to prevent unmounting interruptions
const adminSound = new Audio("/admin-alert.wav");
const customerSound = new Audio("/customer-alert.mp3");
let isAudioUnlocked = false;

export default function GlobalAudioAlerts() {
  const { user, profile } = useAuth();
  const { show: toast } = useToast();
  const toastRef = useRef(toast);

  // Keep toast ref updated without triggering effect re-runs
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Handle mobile browser audio unlock policies
  useEffect(() => {
    const unlockAudio = () => {
      if (isAudioUnlocked) return;

      // Play and immediately pause to trick the browser into unlocking the audio
      adminSound
        .play()
        .then(() => adminSound.pause())
        .catch(() => {});
      customerSound
        .play()
        .then(() => customerSound.pause())
        .catch(() => {});
      isAudioUnlocked = true;
    };

    // Attach listeners with { once: true } so they automatically clean themselves up
    const events = ["click", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    // Fallback cleanup when component completely unmounts
    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, unlockAudio),
      );
    };
  }, []);

  // Manage Supabase Realtime Subscriptions
  useEffect(() => {
    if (!user || !profile) return;

    let activeChannel;

    // --- Handlers ---
    const handleAdminAlert = (payload) => {
      toastRef.current(
        `🚨 New Order Received! ID: ${payload.new.id}`,
        "success",
      );
      adminSound.currentTime = 0;
      adminSound.play().catch((e) => console.warn("Admin audio blocked", e));
    };

    const handleCustomerAlert = (payload) => {
      if (payload.new.status === "completed") {
        toastRef.current(
          `🎉 Good news! Order ${payload.new.id} is ready for pick-up!`,
          "success",
        );
        customerSound.currentTime = 0;
        customerSound
          .play()
          .catch((e) => console.warn("Customer audio blocked", e));
      }
    };

    // --- Subscriptions ---
    if (profile.role === "admin") {
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

    // Cleanup
    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [user, profile]);

  return null;
}
