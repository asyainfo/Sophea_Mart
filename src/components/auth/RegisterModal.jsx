import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";

// Make sure you accept the toast prop here!
export default function RegisterModal({ open, onClose, onSwitchLogin, toast }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const submit = async () => {
    // We must 'await' the result from Supabase
    const success = await register(name, email, pw);

    if (success) {
      toast("Account created! Welcome 🎉");
      onClose();
    } else {
      toast(
        "Registration failed. Password must be at least 6 characters.",
        "error",
      );
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create an Account">
      <Field label="Name" value={name} onChange={setName} type="text" />
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field label="Password" value={pw} onChange={setPw} type="password" />

      <Button onClick={submit} full>
        Sign Up
      </Button>

      <p
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        Already have an account?{" "}
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
