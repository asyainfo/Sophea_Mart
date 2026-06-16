import { useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./ui/Toast";

// --- THE MAGIC FIX: Create sounds OUTSIDE React ---
// Because these are outside the function, React Router can NEVER destroy them
// when you navigate between pages. They stay alive in the background permanently.
const adminSound = new Audio("/admin-alert.wav");
const customerSound = new Audio("/customer-alert.mp3");
let isUnlocked = false;

export default function GlobalAlertListener() {
  const { user, profile } = useAuth();
  const { show: toast } = useToast();

  // 1. Global Audio Unlocker (Beats Browser Autoplay Blockers)
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlocked) return;

      // Play and immediately pause to trick the browser into unlocking the audio
      adminSound
        .play()
        .then(() => adminSound.pause())
        .catch(() => {});
      customerSound
        .play()
        .then(() => customerSound.pause())
        .catch(() => {});

      isUnlocked = true;
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    // The very first click ANYWHERE on the website unlocks the sounds
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // 2. The Unstoppable Realtime Listener
  useEffect(() => {
    if (!user) return;

    let channel;

    // A. ADMIN LISTENER (Fires everywhere)
    if (profile?.role === "admin") {
      channel = supabase
        .channel("unstoppable-admin")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Orders" },
          (payload) => {
            toast(`🚨 New Order! ID: ${payload.new.id}`, "success");
            adminSound.currentTime = 0;
            adminSound
              .play()
              .catch((e) => console.warn("Admin sound blocked", e));
          },
        )
        .subscribe();
    }
    // B. CUSTOMER LISTENER (Fires everywhere)
    else {
      channel = supabase
        .channel(`unstoppable-cust-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.status === "completed") {
              toast(`🎉 Order ${payload.new.id} is ready!`, "success");
              customerSound.currentTime = 0;
              customerSound
                .play()
                .catch((e) => console.warn("Customer sound blocked", e));
            }
          },
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, profile, toast]);

  // This component doesn't render any HTML! It just works in the shadows.
  return null;
}
