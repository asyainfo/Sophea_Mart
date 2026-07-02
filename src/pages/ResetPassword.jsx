import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next"; // 🏆 1. Imported

export default function ResetPassword() {
  const { t } = useTranslation(); // 🏆 2. Initialized
  const [newPassword, setNewPassword] = useState("");
  // Pulls the update function from your Auth hook
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      alert(
        t(
          "reset_password.password_length",
          "Password must be at least 6 characters.",
        ),
      );
      return;
    }

    const success = await updatePassword(newPassword);

    if (success) {
      alert(
        t(
          "reset_password.success",
          "Password updated securely! You can now log in.",
        ),
      );
      navigate("/"); // Send them back to the home page
    } else {
      alert(
        t(
          "reset_password.error",
          "Failed to update password. The link might be expired.",
        ),
      );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        {t("reset_password.title", "Create New Password")}
      </h2>
      <p className="text-center text-gray-500 text-sm mb-6">
        {t(
          "reset_password.instruction",
          "Please enter your new secure password below.",
        )}
      </p>

      <div className="mb-6">
        <Field
          label={t("reset_password.new_password_label", "New Password")}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
      </div>

      <Button onClick={handleSubmit} full>
        {t("reset_password.save_button", "Save New Password")}
      </Button>
    </div>
  );
}
