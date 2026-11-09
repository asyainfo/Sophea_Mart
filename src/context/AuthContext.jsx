import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../services/supabase";

export const AuthContext = createContext(null);

const RECOVERY_STORAGE_KEY = "sophea_password_recovery";

// 🔒 Capture recovery intent immediately at module load BEFORE Supabase strips the URL hash!
function detectInitialRecovery() {
  if (typeof window === "undefined") return false;
  try {
    const hasUrlRecovery =
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery") ||
      window.location.pathname === "/reset-password" ||
      window.location.pathname === "/update-password";

    if (hasUrlRecovery) {
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const initialUrlHasRecovery = detectInitialRecovery();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    initialUrlHasRecovery,
  );

  // Track which user ID is currently loaded or in-flight to prevent duplicate fetches
  const loadedUserIdRef = useRef(null);
  const inFlightUserIdRef = useRef(null);
  const isRegisteringRef = useRef(false);

  const setRecoveryMode = useCallback((active) => {
    setIsPasswordRecovery(active);
    try {
      if (active) {
        sessionStorage.setItem(RECOVERY_STORAGE_KEY, "1");
      } else {
        sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const fetchProfile = useCallback(async (userId, force = false) => {
    if (!userId) {
      loadedUserIdRef.current = null;
      inFlightUserIdRef.current = null;
      setProfile(null);
      return;
    }

    if (
      !force &&
      (loadedUserIdRef.current === userId ||
        inFlightUserIdRef.current === userId)
    ) {
      return;
    }

    inFlightUserIdRef.current = userId;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      loadedUserIdRef.current = userId;
      setProfile(data || null);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
      loadedUserIdRef.current = null;
      setProfile(null);
    } finally {
      if (inFlightUserIdRef.current === userId) {
        inFlightUserIdRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncSession = (sessionUser, forceProfile = false) => {
      if (!isMounted) return;

      setUser((prev) => {
        if (!prev && !sessionUser) return null;
        if (
          prev?.id === sessionUser?.id &&
          prev?.email === sessionUser?.email
        ) {
          return prev;
        }
        return sessionUser;
      });

      if (sessionUser?.id) {
        if (!isRegisteringRef.current) {
          setTimeout(() => {
            if (isMounted) fetchProfile(sessionUser.id, forceProfile);
          }, 0);
        }
      } else {
        loadedUserIdRef.current = null;
        inFlightUserIdRef.current = null;
        setProfile(null);
      }
    };

    // 1. Check if URL has a PKCE ?code= on initial load (for email recovery links)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (
      code &&
      (window.location.pathname === "/reset-password" ||
        window.location.pathname === "/update-password" ||
        initialUrlHasRecovery)
    ) {
      setRecoveryMode(true);
    }

    // 2. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null, false);
    });

    // 3. Subscribe to auth events (SPA state transition — no hard page reload!)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        syncSession(session?.user ?? null, false);
      } else if (event === "SIGNED_OUT") {
        setRecoveryMode(false);
        syncSession(null, false);
      } else if (event === "USER_UPDATED") {
        syncSession(session?.user ?? null, true);
      } else {
        syncSession(session?.user ?? null, false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, setRecoveryMode]);

  const login = useCallback(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) {
        setRecoveryMode(false);
      }
      return { success: !error, error: error?.message };
    },
    [setRecoveryMode],
  );

  const register = useCallback(
    async (name, email, password) => {
      isRegisteringRef.current = true;
      try {
        const cleanName = (name || "").trim();
        const cleanEmail = (email || "").trim().toLowerCase();

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          await supabase.from("profiles").upsert([
            {
              id: data.user.id,
              email: cleanEmail,
              full_name: cleanName,
            },
          ]);

          await fetchProfile(data.user.id, true);
        }

        setRecoveryMode(false);
        return { success: true };
      } finally {
        isRegisteringRef.current = false;
      }
    },
    [fetchProfile, setRecoveryMode],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    inFlightUserIdRef.current = null;
    setRecoveryMode(false);
    setUser(null);
    setProfile(null);
  }, [setRecoveryMode]);

  // 🏆 Always send reset link to /reset-password
  const sendPasswordReset = useCallback(async (email) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("Error sending reset email:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const updatePassword = useCallback(
    async (newPassword) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        console.error("Error updating password:", error.message);
        return { success: false, error: error.message };
      }
      setRecoveryMode(false);
      return { success: true };
    },
    [setRecoveryMode],
  );

  const clearPasswordRecovery = useCallback(() => {
    setRecoveryMode(false);
  }, [setRecoveryMode]);

  const refreshProfile = useCallback(() => {
    if (user?.id) {
      return fetchProfile(user.id, true);
    }
    return Promise.resolve(null);
  }, [user?.id, fetchProfile]);

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      isPasswordRecovery,
      clearPasswordRecovery,
      refreshProfile,
      login,
      logout,
      register,
      sendPasswordReset,
      updatePassword,
    }),
    [
      user,
      profile,
      isPasswordRecovery,
      clearPasswordRecovery,
      refreshProfile,
      login,
      logout,
      register,
      sendPasswordReset,
      updatePassword,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
