import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next"; // 🏆 1. Imported

export default function ForgotPasswordModal({
  open,
  onClose,
  onSwitchLogin,
  toast,
}) {
  const { t } = useTranslation(); // 🏆 2. Initialized
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");

  const submit = async () => {
    if (!email) {
      toast(
        t(
          "forgot_password.enter_email",
          "Please enter your email address first.",
        ),
        "error",
      );
      return;
    }

    const success = await sendPasswordReset(email);
    if (success) {
      toast(
        t(
          "forgot_password.check_email",
          "Check your email for the reset link!",
        ),
        "success",
      );
      onClose();
    } else {
      toast(t("forgot_password.error", "Error sending reset link."), "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("forgot_password.title", "Forgot Password")}
    >
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
        <Field
          label={t("forgot_password.email_label", "Email address")}
          value={email}
          onChange={setEmail}
          type="email"
        />
      </div>

      <Button onClick={submit} full>
        {t("forgot_password.send_link", "Send reset link")}
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
          onClick={onSwitchLogin}
          style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
        >
          {t("forgot_password.sign_in", "Sign In")}
        </span>
      </p>
    </Modal>
  );
}
