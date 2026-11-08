import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export default function RegisterModal({ open, onClose, onSwitchLogin, toast }) {
  const { t } = useTranslation();
  const { register, user } = useAuth();

  // Force brand-new DOM <input> nodes every time modal opens/closes
  const [formResetKey, setFormResetKey] = useState(0);

  // State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔒 Anti-autofill locks (unlocked immediately on user touch/click/focus)
  const [nameReadOnly, setNameReadOnly] = useState(true);
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [pwReadOnly, setPwReadOnly] = useState(true);
  const submittingRef = useRef(false);

  // 🔒 Wipe all sensitive state from memory and recreate input DOM nodes
  const wipeCredentials = useCallback(() => {
    setName("");
    setEmail("");
    setPw("");
    setShowPassword(false);
    setNameReadOnly(true);
    setEmailReadOnly(true);
    setPwReadOnly(true);
    setFormResetKey((prev) => prev + 1);
  }, []);

  // Automatically wipe fields whenever modal opens, closes, or user changes
  useEffect(() => {
    wipeCredentials();
  }, [open, user, wipeCredentials]);

  const handleClose = useCallback(() => {
    wipeCredentials();
    if (onClose) onClose();
  }, [wipeCredentials, onClose]);

  const handleSwitchLogin = useCallback(() => {
    if (isLoading) return;
    wipeCredentials();
    if (onSwitchLogin) onSwitchLogin();
  }, [isLoading, wipeCredentials, onSwitchLogin]);

  // Handlers
  const submit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (submittingRef.current || isLoading) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Frontend Validation (Fast fail)
    if (!cleanName || !cleanEmail || !pw) {
      toast?.(t("register.fill_fields", "Please fill in all fields."), "error");
      return;
    }

    if (pw.length < 6) {
      toast?.(
        t(
          "register.password_length",
          "Password must be at least 6 characters.",
        ),
        "error",
      );
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);

    try {
      // 2. Call our upgraded register function with sanitized inputs
      const result = await register(cleanName, cleanEmail, pw);

      if (result?.success) {
        wipeCredentials();
        toast?.(
          t("register.success", "Account created! Welcome 🎉"),
          "success",
        );
        if (onClose) onClose();
      } else {
        // Clear password on error
        setPw("");
        setShowPassword(false);
        setPwReadOnly(true);
        toast?.(
          result?.error ||
            t("register.failed", "Registration failed. Please try again."),
          "error",
        );
      }
    } catch (error) {
      console.error("Sign up crash:", error);
      setPw("");
      setShowPassword(false);
      toast?.(
        t("register.unexpected_error", "An unexpected error occurred."),
        "error",
      );
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("register.title", "Create an Account")}
    >
      <form key={formResetKey} onSubmit={submit} autoComplete="off" noValidate>
        {/* Off-screen honeypot inputs so Chrome/Safari don't autofill existing logged-in user credentials */}
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
            type="text"
            name="trap_reg_name"
            autoComplete="name"
            tabIndex={-1}
            defaultValue=""
          />
          <input
            type="email"
            name="trap_reg_email"
            autoComplete="username"
            tabIndex={-1}
            defaultValue=""
          />
          <input
            type="password"
            name="trap_reg_password"
            autoComplete="new-password"
            tabIndex={-1}
            defaultValue=""
          />
        </div>

        {/* Name Field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>{t("register.name_label", "Name")}</label>
          <input
            type="text"
            name={`sophea_reg_name_${formResetKey}`}
            autoComplete="off"
            readOnly={nameReadOnly}
            disabled={isLoading}
            value={name}
            placeholder={t("register.name_placeholder", "Full Name")}
            onTouchStart={() => setNameReadOnly(false)}
            onMouseDown={() => setNameReadOnly(false)}
            onFocus={(e) => {
              setNameReadOnly(false);
              e.target.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            onChange={(e) => setName(e.target.value)}
            style={styles.textInput}
          />
        </div>

        {/* Email Field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            {t("register.email_label", "Email")}
          </label>
          <input
            type="email"
            inputMode="email"
            name={`sophea_reg_email_${formResetKey}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            readOnly={emailReadOnly}
            disabled={isLoading}
            value={email}
            placeholder={t("register.email_placeholder", "you@example.com")}
            onTouchStart={() => setEmailReadOnly(false)}
            onMouseDown={() => setEmailReadOnly(false)}
            onFocus={(e) => {
              setEmailReadOnly(false);
              e.target.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.textInput}
          />
        </div>

        {/* Password Field */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            {t("register.password_label", "Password")}
          </label>

          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              name={`sophea_reg_pw_${formResetKey}`}
              autoComplete="new-password"
              readOnly={pwReadOnly}
              value={pw}
              onTouchStart={() => setPwReadOnly(false)}
              onMouseDown={() => setPwReadOnly(false)}
              onFocus={(e) => {
                setPwReadOnly(false);
                e.target.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("register.password_placeholder", "Password")}
              style={styles.input}
              disabled={isLoading}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              disabled={isLoading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>
        </div>

        <Button type="submit" full disabled={isLoading}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiLoader className="animate-spin" />{" "}
              {t("register.signing_up", "Signing Up...")}
            </div>
          ) : (
            t("register.sign_up", "Sign Up")
          )}
        </Button>

        <p style={styles.footerText}>
          {t("register.already_have_account", "Already have an account?")}{" "}
          <span onClick={handleSwitchLogin} style={styles.link}>
            {t("register.sign_in", "Sign In")}
          </span>
        </p>
      </form>
    </Modal>
  );
}

// --- STYLES ---
const styles = {
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  textInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "#ffffff",
  },
  passwordWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    paddingRight: "40px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "#ffffff",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  footerText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#6b7280",
  },
  link: {
    color: "#0066FF",
    cursor: "pointer",
    fontWeight: 600,
  },
};
