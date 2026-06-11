import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Added onSwitchForgot to the modal's props
export default function LoginModal({
  open,
  onClose,
  onSwitchRegister,
  onSwitchForgot,
  toast,
}) {
  const { login } = useAuth(); // Cleaned up unused sendPasswordReset
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    const success = await login(email, pw);

    if (success) {
      toast("Welcome back!");
      onClose();
    } else {
      toast("Invalid email or password.", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sign in to Small Mart">
      <div style={{ marginBottom: "16px" }}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
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
          Password
        </label>

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
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
          onClick={onSwitchForgot} // Updated to switch to the Forgot Password Modal
          style={{
            fontSize: "13px",
            color: "#0066FF",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Forgot Password?
        </span>
      </div>

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
