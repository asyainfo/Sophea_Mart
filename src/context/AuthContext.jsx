import { createContext, useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🏆 1. LOGIN FUNCTION: Now safely returns the success state and error message
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Return the real error message if it fails
    return { success: !error, error: error?.message };
  };

  // 🏆 2. REGISTER FUNCTION: Force the customer's Name into the profiles table immediately
  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // If Supabase rejects it (e.g., email taken, weak password), return the REAL error!
    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      await supabase.from("profiles").upsert([
        {
          id: data.user.id,
          email: email,
          full_name: name,
        },
      ]);
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) {
      console.error("Error sending reset email:", error.message);
      return false;
    }
    return true;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("Error updating password:", error.message);
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        login,
        logout,
        register,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
