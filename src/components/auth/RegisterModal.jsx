import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterModal({ open, onClose, onSwitchLogin, toast }) {
  const { register } = useAuth();

  // State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const submit = async () => {
    // 1. Frontend Validation (Fast fail)
    if (!name.trim() || !email.trim() || !pw) {
      return toast("Please fill in all fields.", "error");
    }
    if (pw.length < 6) {
      return toast("Password must be at least 6 characters.", "error");
    }

    setIsLoading(true);

    try {
      // 2. Call our upgraded register function
      const result = await register(name, email, pw);

      if (result.success) {
        toast("Account created! Welcome 🎉", "success");
        // Reset fields
        setName("");
        setEmail("");
        setPw("");
        onClose();
      } else {
        // 🏆 3. Display the REAL error from Supabase!
        toast(
          result.error || "Registration failed. Please try again.",
          "error",
        );
      }
    } catch (error) {
      console.error("Sign up crash:", error);
      toast("An unexpected error occurred.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create an Account">
      <Field label="Name" value={name} onChange={setName} type="text" />
      <Field label="Email" value={email} onChange={setEmail} type="email" />

      {/* Password Field */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Password</label>

        <div style={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            style={styles.input}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            disabled={isLoading}
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        </div>
      </div>

      <Button onClick={submit} full disabled={isLoading}>
        {isLoading ? "Signing Up..." : "Sign Up"}
      </Button>

      <p style={styles.footerText}>
        Already have an account?{" "}
        <span
          onClick={!isLoading ? onSwitchLogin : undefined}
          style={styles.link}
        >
          Sign In
        </span>
      </p>
    </Modal>
  );
}

// --- STYLES ---
const styles = {
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  passwordWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    paddingRight: "40px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  eyeButton: {
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
  },
  footerText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#6b7280",
  },
  link: {
    color: "#0066FF",
    cursor: "pointer",
    fontWeight: 600,
  },
};
