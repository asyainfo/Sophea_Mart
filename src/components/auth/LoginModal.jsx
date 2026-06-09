import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";

export default function LoginModal({ open, onClose, onSwitchRegister, toast }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  // 1. We must make this function async
  const submit = async () => {
    // 2. We must 'await' the result from Supabase
    const success = await login(email, pw);

    if (success) {
      toast("Welcome back! 👋");
      onClose();
    } else {
      toast("Invalid email or password.", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sign in to Small Mart">
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field label="Password" value={pw} onChange={setPw} type="password" />

      <Button onClick={submit} full>
        Sign In
      </Button>

      <p
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        No account?{" "}
        <span
          onClick={onSwitchRegister}
          style={{ color: "#0066FF", cursor: "pointer", fontWeight: 600 }}
        >
          Register
        </span>
      </p>
    </Modal>
  );
}
