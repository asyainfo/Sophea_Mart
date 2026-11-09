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

// 🔒 Capture recovery intent immediately at module load BEFORE Supabase strips the URL hash!
const initialUrlHasRecovery =
  typeof window !== "undefined" &&
  (window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery") ||
    window.location.pathname === "/reset-password" ||
    window.location.pathname === "/update-password");

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

    // If URL had recovery token or old /update-password path, force browser to /reset-password
    if (
      typeof window !== "undefined" &&
      initialUrlHasRecovery &&
      window.location.pathname !== "/reset-password"
    ) {
      window.location.replace(
        `/reset-password${window.location.search}${window.location.hash}`,
      );
      return;
    }

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

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null, false);
    });

    // 2. Subscribe to auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        syncSession(session?.user ?? null, false);
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/reset-password"
        ) {
          window.location.replace("/reset-password");
        }
      } else if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
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
  }, [fetchProfile]);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { success: !error, error: error?.message };
  }, []);

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

        return { success: true };
      } finally {
        isRegisteringRef.current = false;
      }
    },
    [fetchProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    inFlightUserIdRef.current = null;
    setIsPasswordRecovery(false);
    setUser(null);
    setProfile(null);
  }, []);

  // 🏆 Always send reset link to /reset-password
  const sendPasswordReset = useCallback(async (email) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("Error sending reset email:", error.message);
      return false;
    }
    return true;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Error updating password:", error.message);
      return false;
    }
    setIsPasswordRecovery(false);
    return true;
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

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
