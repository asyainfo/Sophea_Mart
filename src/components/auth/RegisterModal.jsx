import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 1. Added icon imports

export default function RegisterModal({ open, onClose, onSwitchLogin, toast }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 2. Added toggle state

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

      {/* 3. Custom Password Field with Eye Icon */}
      <div className="mb-4">
        <label
          className="block mb-2 text-sm font-medium text-gray-700"
          style={{ fontSize: "14px" }}
        >
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            style={{
              padding: "10px",
              paddingRight: "40px",
              boxSizing: "border-box",
            }} // Inline styles added as fallback to match your Field component
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
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
