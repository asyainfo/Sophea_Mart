import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export default function LoginModal({
  open,
  onClose,
  onSwitchRegister,
  onSwitchForgot,
  toast,
}) {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    // Prevent empty submissions
    if (!email.trim() || !pw.trim()) {
      toast(t("login.fill_fields", "Please fill in all fields."), "error");
      return;
    }

    setIsLoading(true);

    try {
      // 🏆 Fetch the result object from AuthContext
      const result = await login(email, pw);

      // 🏆 Check if the login was actually successful
      if (result.success) {
        toast(t("login.welcome_back", "Welcome back!"), "success");
        onClose();
      } else {
        // 🏆 THE FIX: Force the system to use YOUR translated text,
        // completely ignoring the English error from Supabase.
        toast(
          t("login.invalid_credentials", "Invalid email or password."),
          "error",
        );
      }
    } catch (err) {
      toast(t("login.system_error", "An unexpected error occurred."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("login.title", "Sign in to Sophea Mart")}
    >
      <div style={{ marginBottom: "16px" }}>
        <Field
          label={t("login.email_label", "Email")}
          value={email}
          onChange={setEmail}
          type="email"
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
            placeholder={t("login.password_placeholder", "Password")}
            value={pw}
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
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
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
            }}
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
        }}
      >
        <span
          onClick={onSwitchForgot}
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

      <Button onClick={submit} full disabled={isLoading}>
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
          onClick={onSwitchRegister}
          style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
        >
          {t("login.register", "Register")}
        </span>
      </p>
    </Modal>
  );
}
