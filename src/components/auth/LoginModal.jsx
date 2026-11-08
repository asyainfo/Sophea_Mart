import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { FiEye, FiEyeOff, FiLoader, FiLock } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const LOCKOUT_STORAGE_KEY = "sophea_login_lockout_until";

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

export default function LoginModal({
  open,
  onClose,
  onSwitchRegister,
  onSwitchForgot,
  toast,
}) {
  const { t } = useTranslation();
  const { login, user } = useAuth();

  // Force brand-new DOM <input> nodes every time modal opens/closes/logs out
  const [formResetKey, setFormResetKey] = useState(0);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔒 Anti-autofill locks (unlocked immediately on user touch/click/focus)
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [pwReadOnly, setPwReadOnly] = useState(true);

  // 🔒 Brute-force protection states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(() =>
    getRemainingLockoutSeconds(),
  );
  const submittingRef = useRef(false);

  // 🔒 Completely wipe credentials & destroy/recreate input DOM nodes
  const wipeCredentials = useCallback(() => {
    setEmail("");
    setPw("");
    setShowPassword(false);
    setEmailReadOnly(true);
    setPwReadOnly(true);
    setFormResetKey((prev) => prev + 1);
  }, []);

  // Automatically wipe email & password whenever modal opens, closes, or user logs in/out
  useEffect(() => {
    wipeCredentials();
    setLockoutRemaining(getRemainingLockoutSeconds());
  }, [open, user, wipeCredentials]);

  // Countdown timer when locked out after 5 wrong attempts
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

  const handleClose = useCallback(() => {
    wipeCredentials();
    if (onClose) onClose();
  }, [wipeCredentials, onClose]);

  const handleSwitchRegister = useCallback(() => {
    wipeCredentials();
    if (onSwitchRegister) onSwitchRegister();
  }, [wipeCredentials, onSwitchRegister]);

  const handleSwitchForgot = useCallback(() => {
    wipeCredentials();
    if (onSwitchForgot) onSwitchForgot();
  }, [wipeCredentials, onSwitchForgot]);

  const submit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (submittingRef.current || isLoading) return;

    const currentLock = getRemainingLockoutSeconds();
    if (currentLock > 0) {
      setLockoutRemaining(currentLock);
      toast?.(
        t(
          "login.locked_out",
          `Too many failed attempts. Please wait ${currentLock}s.`,
        ),
        "error",
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pw.trim()) {
      toast?.(t("login.fill_fields", "Please fill in all fields."), "error");
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);

    try {
      const result = await login(cleanEmail, pw);

      if (result?.success) {
        // 🔒 Wipe credentials immediately upon successful authentication
        wipeCredentials();
        setFailedAttempts(0);
        setLockoutRemaining(0);
        try {
          sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // Ignore storage error
        }
        toast?.(t("login.welcome_back", "Welcome back!"), "success");
        if (onClose) onClose();
      } else {
        // 🔒 Clear password field on wrong password & increment brute-force counter
        setPw("");
        setShowPassword(false);
        setPwReadOnly(true);

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
          toast?.(
            t(
              "login.too_many_attempts",
              `Too many failed attempts! Locked for ${LOCKOUT_SECONDS} seconds.`,
            ),
            "error",
          );
        } else {
          toast?.(
            t("login.invalid_credentials", "Invalid email or password."),
            "error",
          );
        }
      }
    } catch {
      setPw("");
      setShowPassword(false);
      toast?.(
        t("login.system_error", "An unexpected error occurred."),
        "error",
      );
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("login.title", "Sign in to Sophea Mart")}
    >
      <form key={formResetKey} onSubmit={submit} autoComplete="off" noValidate>
        {/* Off-screen honeypot inputs (0x0 instead of display:none so Chrome/Safari trap autofill here) */}
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
            name="trap_email"
            autoComplete="username"
            tabIndex={-1}
            defaultValue=""
          />
          <input
            type="password"
            name="trap_password"
            autoComplete="current-password"
            tabIndex={-1}
            defaultValue=""
          />
        </div>

        {/* Email Field (Controlled directly to guarantee zero browser autofill leakage) */}
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
            {t("login.email_label", "Email")}
          </label>
          <input
            type="email"
            inputMode="email"
            name={`sophea_email_${formResetKey}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            readOnly={emailReadOnly}
            disabled={isLocked || isLoading}
            placeholder={t("login.email_placeholder", "you@example.com")}
            value={email}
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
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: "8px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            {t("login.password_label", "Password")}
          </label>

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              name={`sophea_pw_${formResetKey}`}
              autoComplete="new-password"
              readOnly={pwReadOnly}
              disabled={isLocked || isLoading}
              placeholder={t("login.password_placeholder", "Password")}
              value={pw}
              onTouchStart={() => setPwReadOnly(false)}
              onMouseDown={() => setPwReadOnly(false)}
              onFocus={(e) => {
                setPwReadOnly(false);
                e.target.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              onChange={(e) => setPw(e.target.value)}
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          {failedAttempts > 0 && !isLocked ? (
            <span
              style={{ fontSize: "12px", color: "#EF4444", fontWeight: 500 }}
            >
              {MAX_ATTEMPTS - failedAttempts}{" "}
              {t("login.attempts_left", "attempts remaining")}
            </span>
          ) : (
            <span />
          )}

          <span
            onClick={handleSwitchForgot}
            style={{
              fontSize: "13px",
              color: "#0066FF",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {t("login.forgot_password", "Forgot Password?")}
          </span>
        </div>

        <Button type="submit" full disabled={isLoading || isLocked}>
          {isLocked ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiLock size={16} />{" "}
              {t("login.locked_btn", `Locked (${lockoutRemaining}s)`)}
            </div>
          ) : isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiLoader className="animate-spin" />{" "}
              {t("login.signing_in", "Signing in...")}
            </div>
          ) : (
            t("login.sign_in", "Sign In")
          )}
        </Button>

        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          {t("login.no_account", "No account?")}{" "}
          <span
            onClick={handleSwitchRegister}
            style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
          >
            {t("login.register", "Register")}
          </span>
        </p>
      </form>
    </Modal>
  );
}
