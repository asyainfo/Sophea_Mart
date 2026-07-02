import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useTranslation } from "react-i18next"; // 🏆 1. Imported

export default function LoginModal({
  open,
  onClose,
  onSwitchRegister,
  onSwitchForgot,
  toast,
}) {
  const { t } = useTranslation(); // 🏆 2. Initialized
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    // 🏆 NEW: Strict validation check
    // If email or password is blank (or just spaces), stop and show an error
    if (!email.trim() || !pw.trim()) {
      toast(t("login.fill_fields", "Please fill in all fields."), "error");
      return; // This strictly stops the login process right here
    }

    const success = await login(email, pw);

    if (success) {
      toast(t("login.welcome_back", "Welcome back!"), "success");
      onClose();
    } else {
      toast(
        t("login.invalid_credentials", "Invalid email or password."),
        "error",
      );
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

      <Button onClick={submit} full>
        {t("login.sign_in", "Sign In")}
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
