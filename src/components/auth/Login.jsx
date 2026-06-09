import { useState } from "react";
import { supabase } from "../../services/supabase";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 1. Imported the icons

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 2. Added the toggle state

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
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2>Admin Login</h2>
      <form>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            required
          />
        </div>

        {/* 3. Updated Password Field with Eye Icon */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                paddingRight: "40px", // Extra space so text doesn't hide behind the icon
                boxSizing: "border-box",
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
        </div>

        {/* Updated logic: Only shows green if the message contains "successfully" or "Welcome" */}
        {message && (
          <p
            style={{
              color:
                message.includes("successfully") || message.includes("Welcome")
                  ? "green"
                  : "red",
              fontWeight: "bold",
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
              backgroundColor: "#0052FF",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
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
              color: "#0052FF",
              border: "1px solid #0052FF",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading ? "Loading..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
