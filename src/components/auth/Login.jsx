import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabase";
import { FiEye, FiEyeOff, FiLoader, FiLock } from "react-icons/fi";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const LOCKOUT_STORAGE_KEY = "sophea_admin_login_lockout_until";

function getRemainingLockoutSeconds() {
  try {
    const until = Number(sessionStorage.getItem(LOCKOUT_STORAGE_KEY) || 0);
    if (!until) return 0;
    const diff = Math.ceil((until - Date.now()) / 1000);
    if (diff <= 0) {
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
      return 0;
    }
    return diff;
  } catch {
    return 0;
  }
}

export default function Login() {
  const [formResetKey, setFormResetKey] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🔒 Anti-autofill & Brute-force protection states
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [passwordReadOnly, setPasswordReadOnly] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(() =>
    getRemainingLockoutSeconds(),
  );
  const submittingRef = useRef(false);

  // 🔒 Wipe all sensitive state from memory and recreate input DOM nodes
  const wipeCredentials = useCallback(() => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setEmailReadOnly(true);
    setPasswordReadOnly(true);
    setFormResetKey((prev) => prev + 1);
  }, []);

  // Wipe credentials on mount, unmount, and whenever user signs in or signs out
  useEffect(() => {
    wipeCredentials();
    setLockoutRemaining(getRemainingLockoutSeconds());

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        wipeCredentials();
      }
    });

    return () => {
      wipeCredentials();
      authListener?.subscription?.unsubscribe();
    };
  }, [wipeCredentials]);

  // Countdown timer for brute-force protection
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = getRemainingLockoutSeconds();
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Function to handle Sign Up
  const handleSignUp = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (loading || submittingRef.current) return;

    const currentLock = getRemainingLockoutSeconds();
    if (currentLock > 0) {
      setLockoutRemaining(currentLock);
      setIsSuccessMessage(false);
      setMessage(`Too many failed attempts. Please wait ${currentLock}s.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setIsSuccessMessage(false);
      setMessage("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      setIsSuccessMessage(false);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        setPassword("");
        setShowPassword(false);
        setPasswordReadOnly(true);
        setIsSuccessMessage(false);
        setMessage(error.message);
      } else {
        wipeCredentials();
        setIsSuccessMessage(true);
        setMessage("Account created successfully! You are logged in.");
      }
    } catch {
      setPassword("");
      setIsSuccessMessage(false);
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Function to handle Login
  const handleLogin = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (loading || submittingRef.current) return;

    const currentLock = getRemainingLockoutSeconds();
    if (currentLock > 0) {
      setLockoutRemaining(currentLock);
      setIsSuccessMessage(false);
      setMessage(`Too many failed attempts. Please wait ${currentLock}s.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setIsSuccessMessage(false);
      setMessage("Please fill in both email and password.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setPassword("");
        setShowPassword(false);
        setPasswordReadOnly(true);
        setIsSuccessMessage(false);

        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
          try {
            sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(lockUntil));
          } catch {
            // Ignore storage error
          }
          setLockoutRemaining(LOCKOUT_SECONDS);
          setMessage(
            `Too many failed attempts! Locked for ${LOCKOUT_SECONDS} seconds.`,
          );
        } else {
          setMessage("Invalid email or password.");
        }
      } else {
        wipeCredentials();
        setFailedAttempts(0);
        setLockoutRemaining(0);
        try {
          sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // Ignore storage error
        }
        setIsSuccessMessage(true);
        setMessage("Welcome back! You are logged in.");
      }
    } catch {
      setPassword("");
      setShowPassword(false);
      setIsSuccessMessage(false);
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "30px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#111827" }}>Admin Login</h2>
      <form
        key={formResetKey}
        autoComplete="off"
        onSubmit={handleLogin}
        noValidate
      >
        {/* Off-screen honeypot inputs (0x0 so Chrome/Safari trap autofill here) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <input
            type="email"
            name="trap_admin_email"
            autoComplete="username"
            tabIndex={-1}
            defaultValue=""
          />
          <input
            type="password"
            name="trap_admin_password"
            autoComplete="current-password"
            tabIndex={-1}
            defaultValue=""
          />
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Email
          </label>
          <input
            type="email"
            inputMode="email"
            name={`admin_email_${formResetKey}`}
            value={email}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            readOnly={emailReadOnly}
            disabled={isLocked || loading}
            onTouchStart={() => setEmailReadOnly(false)}
            onMouseDown={() => setEmailReadOnly(false)}
            onFocus={(e) => {
              setEmailReadOnly(false);
              e.target.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              fontSize: "14px",
              outline: "none",
              backgroundColor: isLocked ? "#f3f4f6" : "#ffffff",
            }}
            required
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              name={`admin_pw_${formResetKey}`}
              autoComplete="new-password"
              readOnly={passwordReadOnly}
              disabled={isLocked || loading}
              onTouchStart={() => setPasswordReadOnly(false)}
              onMouseDown={() => setPasswordReadOnly(false)}
              onFocus={(e) => {
                setPasswordReadOnly(false);
                e.target.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                paddingRight: "40px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
                fontSize: "14px",
                outline: "none",
                backgroundColor: isLocked ? "#f3f4f6" : "#ffffff",
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLocked}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: isLocked ? "not-allowed" : "pointer",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>
        </div>

        {failedAttempts > 0 && !isLocked && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "12px",
              marginBottom: "12px",
              fontWeight: "500",
            }}
          >
            {MAX_ATTEMPTS - failedAttempts} attempts remaining before temporary
            lockout.
          </p>
        )}

        {message && (
          <p
            style={{
              color: isSuccessMessage ? "#10b981" : "#ef4444",
              fontWeight: "500",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              padding: "10px 15px",
              backgroundColor: isLocked ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: isLocked || loading ? "not-allowed" : "pointer",
              fontWeight: "500",
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isLocked ? (
              <>
                <FiLock size={16} /> Locked ({lockoutRemaining}s)
              </>
            ) : loading ? (
              <>
                <FiLoader className="animate-spin" /> Loading...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading || isLocked}
            style={{
              padding: "10px 15px",
              backgroundColor: "transparent",
              color: "#2563eb",
              border: "1px solid #2563eb",
              borderRadius: "8px",
              cursor: isLocked || loading ? "not-allowed" : "pointer",
              fontWeight: "500",
              flex: 1,
            }}
          >
            {loading ? "Loading..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
