import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Field from "../ui/Field"; // Still used for non-password fields
import Button from "../ui/Button";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Imported eye icons

export default function LoginModal({ open, onClose, onSwitchRegister, toast }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  // 1. Make this function async to await result
  const submit = async () => {
    // 2. Await the result from your useAuth hook
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
      {/* 3. The Email field uses your standard Field component */}
      <Field label="Email" value={email} onChange={setEmail} type="email" />

      {/* 4. The FIXED Password Field - Styling matches other inputs, icon is absolute */}
      <div className="mb-4">
        <label
          className="block mb-2 text-sm font-medium text-gray-700"
          style={{ fontSize: "14px" }}
        >
          Password
        </label>

        {/* Relative container anchors the absolute eye button */}
        <div className="relative">
          <input
            // 5. Toggle the 'type' based on state
            type={showPassword ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            // 6. TAILWIND STYLING:
            // pr-10 adds extra padding on the right so the text doesn't hide behind the icon.
            // border, rounded, and focus styles match your other fields.
            className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            style={{
              padding: "10px",
              paddingRight: "40px",
              boxSizing: "border-box",
            }}
          />

          {/* 7. ABSOLUTE ICON BUTTON: Pins the icon inside the right edge */}
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
