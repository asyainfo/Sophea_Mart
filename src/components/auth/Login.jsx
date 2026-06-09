import { useState } from "react";
import { supabase } from "../../services/supabase";
// 1. Switched to Feather Icons for the clean, thin look
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Function to handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created successfully! You are logged in.");
    }
    setLoading(false);
  };

  // Function to handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Welcome back! You are logged in.");
      console.log("Logged in user:", data.user);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "30px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", // Added a subtle shadow to make the admin card pop
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#111827" }}>Admin Login</h2>
      <form>
        {/* Updated Email Field Styling */}
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
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            required
          />
        </div>

        {/* Updated Password Field Styling with Thin Icon */}
        <div style={{ marginBottom: "20px" }}>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              required
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

        {message && (
          <p
            style={{
              color:
                message.includes("successfully") || message.includes("Welcome")
                  ? "#10b981" // A nicer, softer green
                  : "#ef4444", // A nicer, softer red
              fontWeight: "500",
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: "10px 15px",
              backgroundColor: "#2563eb", // Updated to a modern Tailwind blue
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              flex: 1, // Makes buttons take up even space
            }}
          >
            {loading ? "Loading..." : "Sign In"}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            style={{
              padding: "10px 15px",
              backgroundColor: "transparent",
              color: "#2563eb",
              border: "1px solid #2563eb",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              flex: 1,
            }}
          >
            {loading ? "Loading..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
