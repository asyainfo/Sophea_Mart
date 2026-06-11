import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";

export default function ForgotPasswordModal({
  open,
  onClose,
  onSwitchLogin,
  toast,
}) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");

  const submit = async () => {
    if (!email) {
      toast("Please enter your email address first.", "error");
      return;
    }

    const success = await sendPasswordReset(email);
    if (success) {
      toast("Check your email for the reset link! ");
      onClose();
    } else {
      toast("Error sending reset link.", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Forgot Password">
      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "20px",
          marginTop: "-8px",
        }}
      >
        Enter your account email and we will send you a reset link.
      </p>

      <div style={{ marginBottom: "24px" }}>
        <Field
          label="Email address"
          value={email}
          onChange={setEmail}
          type="email"
        />
      </div>

      <Button onClick={submit} full>
        Send reset link
      </Button>

      <p
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        Remember your password?{" "}
        <span
          onClick={onSwitchLogin}
          style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
        >
          Sign In
        </span>
      </p>
    </Modal>
  );
}
