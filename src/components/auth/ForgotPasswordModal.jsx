import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { FiLoader, FiClock } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "sophea_reset_pw_cooldown_until";

function getRemainingCooldown() {
  try {
    const until = Number(sessionStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
    if (!until) return 0;
    const diff = Math.ceil((until - Date.now()) / 1000);
    if (diff <= 0) {
      sessionStorage.removeItem(COOLDOWN_STORAGE_KEY);
      return 0;
    }
    return diff;
  } catch {
    return 0;
  }
}

export default function ForgotPasswordModal({
  open,
  onClose,
  onSwitchLogin,
  toast,
}) {
  const { t } = useTranslation();
  const { sendPasswordReset, user } = useAuth();

  const [formResetKey, setFormResetKey] = useState(0);
  const [email, setEmail] = useState("");
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(() => getRemainingCooldown());
  const submittingRef = useRef(false);

  // 🔒 Wipe email field and recreate DOM node on open/close/user change
  const wipeEmail = useCallback(() => {
    setEmail("");
    setEmailReadOnly(true);
    setFormResetKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    wipeEmail();
    setCooldown(getRemainingCooldown());
  }, [open, user, wipeEmail]);

  // Countdown timer to prevent email spam
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(getRemainingCooldown());
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleClose = useCallback(() => {
    wipeEmail();
    if (onClose) onClose();
  }, [wipeEmail, onClose]);

  const handleSwitchLogin = useCallback(() => {
    if (isLoading) return;
    wipeEmail();
    if (onSwitchLogin) onSwitchLogin();
  }, [isLoading, wipeEmail, onSwitchLogin]);

  const submit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (submittingRef.current || isLoading) return;

    const currentCooldown = getRemainingCooldown();
    if (currentCooldown > 0) {
      setCooldown(currentCooldown);
      toast?.(
        t(
          "forgot_password.wait_cooldown",
          `Please wait ${currentCooldown}s before requesting another link.`,
        ),
        "error",
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast?.(
        t(
          "forgot_password.enter_email",
          "Please enter a valid email address first.",
        ),
        "error",
      );
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);

    try {
      const result = await sendPasswordReset(cleanEmail);
      const isOk =
        typeof result === "object" && result !== null
          ? Boolean(result.success ?? !result.error)
          : Boolean(result);

      if (isOk) {
        wipeEmail();
        const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
        try {
          sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
        } catch {
          // Ignore storage error
        }
        setCooldown(COOLDOWN_SECONDS);

        toast?.(
          t(
            "forgot_password.check_email",
            "Check your email for the reset link!",
          ),
          "success",
        );
        if (onClose) onClose();
      } else {
        toast?.(
          (typeof result === "object" && result?.error) ||
            t("forgot_password.error", "Error sending reset link."),
          "error",
        );
      }
    } catch {
      toast?.(t("forgot_password.error", "Error sending reset link."), "error");
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  const isCoolingDown = cooldown > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("forgot_password.title", "Forgot Password")}
    >
      <form key={formResetKey} onSubmit={submit} autoComplete="off" noValidate>
        {/* Off-screen honeypot input to block browser autofill */}
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
            name="trap_forgot_email"
            autoComplete="username"
            tabIndex={-1}
            defaultValue=""
          />
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "20px",
            marginTop: "-8px",
          }}
        >
          {t(
            "forgot_password.instruction",
            "Enter your account email and we will send you a reset link.",
          )}
        </p>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            {t("forgot_password.email_label", "Email address")}
          </label>
          <input
            type="email"
            inputMode="email"
            name={`sophea_forgot_email_${formResetKey}`}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            readOnly={emailReadOnly}
            disabled={isLoading || isCoolingDown}
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
              backgroundColor: isCoolingDown ? "#f3f4f6" : "#ffffff",
            }}
          />
        </div>

        <Button type="submit" full disabled={isLoading || isCoolingDown}>
          {isCoolingDown ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiClock size={16} />{" "}
              {t("forgot_password.wait_btn", `Wait ${cooldown}s`)}
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
              {t("forgot_password.sending", "Sending...")}
            </div>
          ) : (
            t("forgot_password.send_link", "Send reset link")
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
          {t("forgot_password.remember", "Remember your password?")}{" "}
          <span
            onClick={handleSwitchLogin}
            style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
          >
            {t("forgot_password.sign_in", "Sign In")}
          </span>
        </p>
      </form>
    </Modal>
  );
}
