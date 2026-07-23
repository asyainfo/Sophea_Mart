import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart,
  FiUser,
  FiChevronDown,
  FiPlus,
  FiLogOut,
  FiLoader,
  FiSettings,
  FiPackage,
  FiHeart,
  FiAward,
  FiGlobe,
  FiMaximize, // 🏆 Scanner Icon
} from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next";
import BarcodeScanner from "../scanner/BarcodeScanner"; // 🏆 Import the Scanner

export default function Navbar({ onLogin, onRegister, onCartOpen }) {
  const navigate = useNavigate();
  const { user, logout, profile } = useAuth();
  const { count } = useCart();

  const { t, i18n } = useTranslation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showScanner, setShowScanner] = useState(false); // 🏆 Scanner State
  const dropdownRef = useRef(null);

  const displayName = profile?.full_name || user?.email || "User";
  const firstName = displayName.split(" ")[0];
  const isStaff = profile?.role === "admin" || profile?.role === "cashier";

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "km" : "en";
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (
      !window.confirm(
        t("navbar.logout_confirm", "Are you sure you want to log out?"),
      )
    )
      return;
    setIsLoggingOut(true);
    try {
      await logout();
      setProfileOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
      alert(t("navbar.logout_failed", "Failed to log out."));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setProfileOpen(false);
  };

  return (
    <>
      <style>
        {`
          .nav-container { position: sticky; top: 0; z-index: 300; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; padding: 0 24px; }
          .inner-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 70px; }
          .logo-wrapper { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
          .logo-img { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
          .logo-text { font-weight: 900; font-size: 20px; color: #111827; letter-spacing: -0.5px; white-space: nowrap; }
          .actions-wrapper { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
          .btn-base { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 9999px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s; font-size: 14px; }
          .btn-lang { background: #FFFFFF; border: 1px solid #E5E7EB; padding: 0 14px; color: #111827; }
          .btn-admin { background: #2563EB; border: none; padding: 0 16px; color: #FFFFFF; }
          .btn-profile { background: #EFF6FF; border: 1px solid #BFDBFE; padding: 0 16px; color: #2563EB; }
          .btn-cart { position: relative; width: 44px; height: 44px; border-radius: 12px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #2563EB; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
          .cart-badge { position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 50%; background: #0066FF; color: #FFFFFF; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; }
          .show-mobile { display: none; }
          .icon-md { font-size: 18px; }

          @media (max-width: 768px) {
            .nav-container { padding: 0 16px; }
            .inner-container { height: 60px; }
            .logo-img { width: 38px; height: 38px; border-radius: 10px; }
            .logo-text { font-size: 18px; }
            .btn-base { height: 40px; padding: 0 12px; gap: 6px; }
            .btn-cart { width: 40px; height: 40px; border-radius: 10px; }
            .icon-md { font-size: 16px; }
          }
          @media (max-width: 640px) {
            .nav-container { padding: 0 12px; }
            .actions-wrapper { gap: 8px; }
            .btn-base { height: 38px; padding: 0 10px; font-size: 13px; }
            .btn-cart { width: 38px; height: 38px; }
            .logo-img { width: 36px; height: 36px; }
            .logo-text { display: none; }
            .hide-mobile { display: none !important; }
            .show-mobile { display: inline-block !important; }
            .btn-base.icon-only { padding: 0; width: 38px; justify-content: center; border-radius: 50%; }
          }
        `}
      </style>

      <nav className="nav-container">
        <div className="inner-container">
          <div onClick={() => navigate("/")} className="logo-wrapper">
            <img src="/Sophea Mart no1.png" alt="Logo" className="logo-img" />
            <span className="logo-text">
              SOPHEA <span style={{ color: "#0066FF" }}>MART</span>
            </span>
          </div>

          <div className="actions-wrapper">
            <button
              onClick={toggleLanguage}
              className="btn-base btn-lang"
              title="Change Language"
            >
              <FiGlobe className="icon-md" color="#0066FF" />
              <span className="hide-mobile" style={{ fontWeight: 700 }}>
                {i18n.language === "en" ? "🇺🇸 EN" : "🇰🇭 ខ្មែរ"}
              </span>
              <span
                className="show-mobile"
                style={{ fontWeight: 700, fontSize: 13, color: "#0066FF" }}
              >
                {i18n.language === "en" ? "EN" : "KM"}
              </span>
            </button>

            {!user ? (
              <>
                <Button onClick={onLogin} variant="ghost" small>
                  {t("navbar.sign_in", "Sign In")}
                </Button>
                <Button onClick={onRegister} small>
                  {t("navbar.sign_up", "Sign Up")}
                </Button>
              </>
            ) : (
              <>
                {isStaff && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="btn-base btn-admin icon-only"
                    title={t("navbar.role_admin", "Admin")}
                  >
                    <FiSettings className="icon-md" />
                    <span className="hide-mobile">
                      {profile?.role === "admin"
                        ? t("navbar.role_admin", "Admin")
                        : t("navbar.role_cashier", "Cashier")}
                    </span>
                  </button>
                )}

                <div style={{ position: "relative" }} ref={dropdownRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="btn-base btn-profile icon-only"
                  >
                    <FiUser className="icon-md" />
                    <span className="hide-mobile">{firstName}</span>
                    <div
                      className="hide-mobile"
                      style={{
                        display: "flex",
                        transition: "transform 0.3s",
                        transform: profileOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <FiChevronDown size={16} />
                    </div>
                  </button>

                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "8px",
                      width: "200px",
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      overflow: "hidden",
                      transition: "all 0.2s",
                      transformOrigin: "top right",
                      opacity: profileOpen ? 1 : 0,
                      pointerEvents: profileOpen ? "auto" : "none",
                    }}
                  >
                    <button
                      onClick={() => handleNavigation("/order-history")}
                      style={dropdownItemStyle}
                    >
                      <FiPackage size={16} />{" "}
                      {t("navbar.my_orders", "My Orders")}
                    </button>
                    <button
                      onClick={() => handleNavigation("/favorites")}
                      style={dropdownItemStyle}
                    >
                      <FiHeart size={16} />{" "}
                      {t("navbar.saved_items", "Saved Items")}
                    </button>
                    <button
                      onClick={() => handleNavigation("/redeem")}
                      style={{
                        ...dropdownItemStyle,
                        color: "#0066FF",
                        fontWeight: 600,
                      }}
                    >
                      <FiAward size={16} /> {t("navbar.rewards", "Rewards")}
                    </button>

                    {/* 🏆 SCAN BARCODE BUTTON */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setShowScanner(true);
                      }}
                      style={{ ...dropdownItemStyle, fontWeight: 600 }}
                    >
                      <FiMaximize size={16} />{" "}
                      {t("navbar.scan_barcode", "Scan Barcode")}
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onRegister();
                      }}
                      style={dropdownItemStyle}
                    >
                      <FiPlus size={16} />{" "}
                      {t("navbar.add_account", "Add Account")}
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      style={{ ...dropdownItemStyle, color: "#DC2626" }}
                    >
                      {isLoggingOut ? (
                        <FiLoader className="animate-spin" />
                      ) : (
                        <FiLogOut size={16} />
                      )}
                      {isLoggingOut ? "..." : t("navbar.log_out", "Log Out")}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button onClick={onCartOpen} className="btn-cart">
              <FiShoppingCart className="icon-md" />
              {count > 0 && (
                <span className="cart-badge">{count > 99 ? "99+" : count}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 🏆 CAMERA MOUNTS HERE & DISPATCHES EVENT */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScanSuccess={(barcode) => {
            setShowScanner(false);
            window.dispatchEvent(
              new CustomEvent("store-barcode-scanned", { detail: barcode }),
            );
          }}
        />
      )}
    </>
  );
}

const dropdownItemStyle = {
  width: "100%",
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  border: "none",
  borderBottom: "1px solid #E5E7EB",
  cursor: "pointer",
  fontSize: "14px",
  background: "transparent",
  transition: "background 0.2s",
  whiteSpace: "nowrap",
  textAlign: "left",
};
