import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
// Swapped to 'fi' (Feather Icons) for the thin, outlined look
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterModal({ open, onClose, onSwitchLogin, toast }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
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

      {/* Cleaned Password Field to match Field component styling */}
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
          Password
        </label>

        {/* The relative container keeps the icon trapped inside the input */}
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              paddingRight: "40px", // Leaves empty space so text doesn't type over the icon
              borderRadius: "8px", // Gives the nice rounded corners
              border: "1px solid #d1d5db", // Light gray border to match Email field
              boxSizing: "border-box",
              fontSize: "14px",
              outline: "none",
            }}
            // Added focus styling to turn border blue when clicked
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px", // Pinned inside the box on the right
              top: "50%",
              transform: "translateY(-50%)", // Perfectly centers it vertically
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af", // Soft gray icon color
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
