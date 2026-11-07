import {
  useState,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  memo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

// ⚡ Lazy-load BarcodeScanner so regular customers don't download 350KB of camera code on startup!
const loadScannerChunk = () => import("../scanner/BarcodeScanner");
const BarcodeScanner = lazy(loadScannerChunk);

// ⚡ Route chunk prefetchers for 0ms instant navigation on hover/touch
const prefetchRoute = (route) => {
  try {
    if (route === "/order-history") import("../../pages/OrderHistory");
    else if (route === "/favorites") import("../../pages/Favorites");
    else if (route === "/redeem") import("../../pages/Redeem");
    else if (route === "/admin") import("../../pages/AdminDashboard");
  } catch {
    // Ignore prefetch errors
  }
};

const NAVBAR_CSS = `
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
  .dropdown-item:hover { background: #F9FAFB !important; }

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
`;

function Navbar({ onLogin, onRegister, onCartOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profile } = useAuth();
  const { count } = useCart();

  const { t, i18n } = useTranslation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = profile?.full_name || user?.email || "User";
  const firstName = displayName.split(" ")[0];
  const isStaff = profile?.role === "admin" || profile?.role === "cashier";
  const isEnglish = (i18n.language || "en").startsWith("en");

  const toggleLanguage = useCallback(() => {
    const newLang = isEnglish ? "km" : "en";
    i18n.changeLanguage(newLang);
  }, [isEnglish, i18n]);

  // Close profile menu on click/touch outside or Escape key
  useEffect(() => {
    if (!profileOpen) return;

    function handleOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

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
    setProfileOpen(false);
    navigate(path);
  };

  const handleToggleProfileMenu = () => {
    setProfileOpen((prev) => {
      const next = !prev;
      if (next) {
        // Warm up customer page chunks when dropdown opens so clicking is instant
        prefetchRoute("/order-history");
        prefetchRoute("/favorites");
        prefetchRoute("/redeem");
      }
      return next;
    });
  };

  const handleBarcodeScanned = useCallback(
    (barcode) => {
      setShowScanner(false);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("store-barcode-scanned", { detail: barcode }),
          );
        }, 80);
      } else {
        window.dispatchEvent(
          new CustomEvent("store-barcode-scanned", { detail: barcode }),
        );
      }
    },
    [location.pathname, navigate],
  );

  return (
    <>
      <style>{NAVBAR_CSS}</style>

      <nav className="nav-container">
        <div className="inner-container">
          <div onClick={() => navigate("/")} className="logo-wrapper">
            <img
              src="/Sophea Mart no1.png"
              alt="Logo"
              decoding="async"
              fetchPriority="high"
              className="logo-img"
            />
            <span className="logo-text">
              SOPHEA <span style={{ color: "#0066FF" }}>MART</span>
            </span>
          </div>

          <div className="actions-wrapper">
            <button
              type="button"
              onClick={toggleLanguage}
              className="btn-base btn-lang"
              title="Change Language"
            >
              <FiGlobe className="icon-md" color="#0066FF" />
              <span className="hide-mobile" style={{ fontWeight: 700 }}>
                {isEnglish ? "🇺🇸 EN" : "🇰🇭 ខ្មែរ"}
              </span>
              <span
                className="show-mobile"
                style={{ fontWeight: 700, fontSize: 13, color: "#0066FF" }}
              >
                {isEnglish ? "EN" : "KM"}
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
                    type="button"
                    onMouseEnter={() => prefetchRoute("/admin")}
                    onTouchStart={() => prefetchRoute("/admin")}
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
                    type="button"
                    onClick={handleToggleProfileMenu}
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
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleNavigation("/order-history")}
                      style={dropdownItemStyle}
                    >
                      <FiPackage size={16} />{" "}
                      {t("navbar.my_orders", "My Orders")}
                    </button>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleNavigation("/favorites")}
                      style={dropdownItemStyle}
                    >
                      <FiHeart size={16} />{" "}
                      {t("navbar.saved_items", "Saved Items")}
                    </button>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleNavigation("/redeem")}
                      style={{
                        ...dropdownItemStyle,
                        color: "#0066FF",
                        fontWeight: 600,
                      }}
                    >
                      <FiAward size={16} /> {t("navbar.rewards", "Rewards")}
                    </button>

                    {isStaff && (
                      <button
                        type="button"
                        className="dropdown-item"
                        onMouseEnter={loadScannerChunk}
                        onTouchStart={loadScannerChunk}
                        onClick={() => {
                          setProfileOpen(false);
                          setShowScanner(true);
                        }}
                        style={{ ...dropdownItemStyle, fontWeight: 600 }}
                      >
                        <FiMaximize size={16} />{" "}
                        {t("navbar.scan_barcode", "Scan Barcode")}
                      </button>
                    )}

                    <button
                      type="button"
                      className="dropdown-item"
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
                      type="button"
                      className="dropdown-item"
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

            <button
              type="button"
              onClick={onCartOpen}
              className="btn-cart"
              aria-label="Shopping Cart"
            >
              <FiShoppingCart className="icon-md" />
              {count > 0 && (
                <span className="cart-badge">{count > 99 ? "99+" : count}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 🏆 CAMERA MOUNTS LAZILY ONLY WHEN OPENED BY STAFF */}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onClose={() => setShowScanner(false)}
            onScanSuccess={handleBarcodeScanned}
          />
        </Suspense>
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

export default memo(Navbar);
