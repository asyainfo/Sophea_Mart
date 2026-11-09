import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import Button from "../components/ui/Button";
import {
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { updatePassword, user, isPasswordRecovery, clearPasswordRecovery } =
    useAuth();
  const navigate = useNavigate();

  const [formResetKey, setFormResetKey] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 🔒 Anti-autofill locks
  const [pwReadOnly, setPwReadOnly] = useState(true);
  const [confirmReadOnly, setConfirmReadOnly] = useState(true);

  const [verifyingLink, setVerifyingLink] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const submittingRef = useRef(false);
  const redirectTimerRef = useRef(null);

  const wipeFields = useCallback(() => {
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setPwReadOnly(true);
    setConfirmReadOnly(true);
    setFormResetKey((prev) => prev + 1);
  }, []);

  // Safely exit recovery mode, strip any recovery hash, and go straight to homepage
  const handleBackToStore = useCallback(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    wipeFields();
    clearPasswordRecovery?.();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("sophea_password_recovery");
      } catch {
        // Ignore storage error
      }
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    navigate("/", { replace: true });
  }, [wipeFields, clearPasswordRecovery, navigate]);

  // Verify recovery token/session from email link on mount
  // NOTE: Do NOT include isPasswordRecovery in dependency array so clearing it doesn't kill redirectTimerRef!
  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    const urlHasRecoveryToken =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("code=") ||
        window.location.search.includes("type=recovery"));

    const verifyRecoverySession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          setHasValidSession(true);
          setVerifyingLink(false);
        } else if (urlHasRecoveryToken || isPasswordRecovery) {
          fallbackTimer = setTimeout(() => {
            if (isMounted) {
              setVerifyingLink(false);
            }
          }, 1500);
        } else {
          setVerifyingLink(false);
        }
      } catch {
        if (isMounted) {
          setVerifyingLink(false);
        }
      }
    };

    verifyRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        session?.user
      ) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        setHasValidSession(true);
        setVerifyingLink(false);
      }
    });

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also mark valid immediately if AuthContext user is already present
  useEffect(() => {
    if (user?.id) {
      setHasValidSession(true);
      setVerifyingLink(false);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (submittingRef.current || isLoading || isSuccess) return;
    setErrorMsg("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(
        t(
          "reset_password.password_length",
          "Password must be at least 6 characters.",
        ),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(
        t("reset_password.password_mismatch", "Passwords do not match."),
      );
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);

    try {
      const result = await updatePassword(newPassword);
      const isOk =
        typeof result === "object" && result !== null
          ? Boolean(result.success ?? !result.error)
          : Boolean(result);

      if (isOk) {
        wipeFields();
        clearPasswordRecovery?.();
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("sophea_password_recovery");
          } catch {
            // Ignore
          }
          if (window.location.hash || window.location.search) {
            window.history.replaceState(null, "", "/reset-password");
          }
        }
        setIsSuccess(true);

        // Automatically redirect to homepage after 1.2 seconds
        redirectTimerRef.current = setTimeout(() => {
          navigate("/", { replace: true });
        }, 1200);
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setPwReadOnly(true);
        setConfirmReadOnly(true);
        setErrorMsg(
          t(
            "reset_password.error",
            "Failed to update password. The reset link may have expired.",
          ),
        );
      }
    } catch {
      setNewPassword("");
      setConfirmPassword("");
      setPwReadOnly(true);
      setConfirmReadOnly(true);
      setErrorMsg(
        t(
          "reset_password.error",
          "Failed to update password. The reset link may have expired.",
        ),
      );
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          {isSuccess ? (
            <FiCheckCircle size={28} color="#10B981" />
          ) : (
            <FiLock size={26} color="#0066FF" />
          )}
        </div>

        <h2 style={styles.title}>
          {t("reset_password.title", "Create New Password")}
        </h2>
        <p style={styles.subtitle}>
          {t(
            "reset_password.instruction",
            "Please enter your new secure password below.",
          )}
        </p>

        {verifyingLink ? (
          <div style={styles.centerBox}>
            <FiLoader
              size={28}
              color="#0066FF"
              className="animate-spin"
              style={{ marginBottom: 12 }}
            />
            <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
              {t("reset_password.verifying", "Verifying secure reset link...")}
            </p>
          </div>
        ) : isSuccess ? (
          <div>
            <div style={{ ...styles.successBanner, marginBottom: "16px" }}>
              <FiCheckCircle size={20} style={{ flexShrink: 0 }} />
              <span>
                {t(
                  "reset_password.success",
                  "Password updated securely! Redirecting to store...",
                )}
              </span>
            </div>

            <Button onClick={handleBackToStore} full>
              <div style={styles.btnContent}>
                <FiArrowLeft size={16} />{" "}
                {t("reset_password.back_home", "Back to Store")}
              </div>
            </Button>
          </div>
        ) : !hasValidSession ? (
          <div style={{ textAlign: "center" }}>
            <div style={styles.errorBanner}>
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>
                {t(
                  "reset_password.invalid_link",
                  "This password reset link is invalid or has expired. Please request a new reset link.",
                )}
              </span>
            </div>
            <Button onClick={handleBackToStore} full>
              <div style={styles.btnContent}>
                <FiArrowLeft size={16} />{" "}
                {t("reset_password.back_home", "Back to Store")}
              </div>
            </Button>
          </div>
        ) : (
          <form
            key={formResetKey}
            onSubmit={handleSubmit}
            autoComplete="off"
            noValidate
          >
            {/* Off-screen honeypot inputs to prevent old password autofill */}
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
                name="trap_reset_user"
                autoComplete="username"
                tabIndex={-1}
                defaultValue=""
              />
              <input
                type="password"
                name="trap_reset_pw"
                autoComplete="new-password"
                tabIndex={-1}
                defaultValue=""
              />
            </div>

            {errorMsg && (
              <div style={styles.errorBanner}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* New Password Field */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                {t("reset_password.new_password_label", "New Password")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name={`sophea_new_pw_${formResetKey}`}
                  autoComplete="new-password"
                  readOnly={pwReadOnly}
                  disabled={isLoading}
                  placeholder={t(
                    "reset_password.new_password_placeholder",
                    "At least 6 characters",
                  )}
                  value={newPassword}
                  onTouchStart={() => setPwReadOnly(false)}
                  onMouseDown={() => setPwReadOnly(false)}
                  onFocus={(e) => {
                    setPwReadOnly(false);
                    e.target.style.borderColor = "#3b82f6";
                  }}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div style={{ ...styles.fieldGroup, marginBottom: 24 }}>
              <label style={styles.label}>
                {t(
                  "reset_password.confirm_password_label",
                  "Confirm New Password",
                )}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name={`sophea_confirm_pw_${formResetKey}`}
                  autoComplete="new-password"
                  readOnly={confirmReadOnly}
                  disabled={isLoading}
                  placeholder={t(
                    "reset_password.confirm_password_placeholder",
                    "Re-enter new password",
                  )}
                  value={confirmPassword}
                  onTouchStart={() => setConfirmReadOnly(false)}
                  onMouseDown={() => setConfirmReadOnly(false)}
                  onFocus={(e) => {
                    setConfirmReadOnly(false);
                    e.target.style.borderColor = "#3b82f6";
                  }}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" full disabled={isLoading}>
              {isLoading ? (
                <div style={styles.btnContent}>
                  <FiLoader className="animate-spin" />{" "}
                  {t("reset_password.saving", "Saving...")}
                </div>
              ) : (
                t("reset_password.save_button", "Save New Password")
              )}
            </Button>

            <button
              type="button"
              onClick={handleBackToStore}
              disabled={isLoading}
              style={styles.cancelBtn}
            >
              {t("reset_password.cancel", "Back to Store")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "32px 24px",
    backgroundColor: "#FFFFFF",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    border: "1px solid #F3F4F6",
  },
  iconCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "800",
    textAlign: "center",
    margin: "0 0 8px",
    color: "#111827",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6B7280",
    textAlign: "center",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  centerBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 0",
  },
  fieldGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "11px 12px",
    paddingRight: "40px",
    borderRadius: "10px",
    border: "1px solid #D1D5DB",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#FFFFFF",
    transition: "border-color 0.2s",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#9CA3AF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "10px",
    color: "#DC2626",
    fontSize: "13px",
    fontWeight: "500",
    marginBottom: "16px",
    textAlign: "left",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px",
    backgroundColor: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: "12px",
    color: "#059669",
    fontSize: "14px",
    fontWeight: "600",
  },
  btnContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  cancelBtn: {
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    background: "transparent",
    border: "none",
    color: "#6B7280",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
};
