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
} from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import Button from "../ui/Button";

export default function Navbar({ onLogin, onRegister, onCartOpen }) {
  const navigate = useNavigate();
  const { user, logout, profile } = useAuth();
  const { count } = useCart();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  // 🏆 Logic: Prioritize database 'full_name', fallback to email
  const displayName = profile?.full_name || user?.email || "User";
  const firstName = displayName.split(" ")[0];

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
    if (!window.confirm("Are you sure you want to log out?")) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setProfileOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
      alert("Failed to log out.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setProfileOpen(false);
  };

  return (
    <nav style={styles.navBar} className="nav-container-mobile">
      <div style={styles.innerContainer}>
        {/* Logo */}
        <div onClick={() => navigate("/")} style={styles.logoWrapper}>
          <img src="/Sophea Mart no1.png" alt="Logo" style={styles.logoImage} />
          <span style={styles.logoText}>
            SOPHEA <span style={{ color: "#0066FF" }}>MART</span>
          </span>
        </div>

        {/* Actions */}
        <div style={styles.actionsWrapper}>
          {!user ? (
            <>
              <Button onClick={onLogin} variant="ghost" small>
                Sign In
              </Button>
              <Button onClick={onRegister} small>
                Sign Up
              </Button>
            </>
          ) : (
            <>
              {profile?.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  style={styles.adminButton}
                >
                  <FiSettings size={18} />{" "}
                  <span className="hide-on-mobile">Admin</span>
                </button>
              )}

              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={styles.profileButton}
                >
                  <FiUser size={18} />
                  <span className="hide-on-mobile">{firstName}</span>
                  <div
                    style={{
                      ...styles.chevron,
                      transform: profileOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    <FiChevronDown size={16} />
                  </div>
                </button>

                {/* Dropdown */}
                <div
                  style={{
                    ...styles.dropdownBox,
                    opacity: profileOpen ? 1 : 0,
                    pointerEvents: profileOpen ? "auto" : "none",
                  }}
                >
                  <button
                    onClick={() => handleNavigation("/order-history")}
                    style={styles.dropdownItem}
                  >
                    <FiPackage size={16} /> My Orders
                  </button>
                  <button
                    onClick={() => handleNavigation("/favorites")}
                    style={styles.dropdownItem}
                  >
                    <FiHeart size={16} /> Saved Items
                  </button>
                  <button
                    onClick={() => handleNavigation("/redeem")}
                    style={{
                      ...styles.dropdownItem,
                      color: "#0066FF",
                      fontWeight: 600,
                    }}
                  >
                    <FiAward size={16} /> Rewards
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onRegister();
                    }}
                    style={styles.dropdownItem}
                  >
                    <FiPlus size={16} /> Add Account
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={{ ...styles.dropdownItem, color: "#DC2626" }}
                  >
                    {isLoggingOut ? (
                      <FiLoader className="animate-spin" />
                    ) : (
                      <FiLogOut size={16} />
                    )}
                    {isLoggingOut ? "..." : "Log Out"}
                  </button>
                </div>
              </div>
            </>
          )}

          <button onClick={onCartOpen} style={styles.cartButton}>
            <FiShoppingCart size={20} />
            {count > 0 && (
              <span style={styles.cartBadge}>{count > 99 ? "99+" : count}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// --- STYLES ---
const styles = {
  navBar: {
    position: "sticky",
    top: 0,
    zIndex: 300,
    background: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
    padding: "0 24px",
  },
  innerContainer: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: 70,
  },
  logoWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  logoImage: { width: 44, height: 44, borderRadius: 12, objectFit: "cover" },
  logoText: { fontWeight: 700, fontSize: 20, color: "#111827" },
  actionsWrapper: { display: "flex", alignItems: "center", gap: 12 },
  adminButton: {
    background: "#2563EB",
    color: "white",
    border: "none",
    padding: "0 16px",
    borderRadius: "9999px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 44,
  },
  profileButton: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "9999px",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    color: "#2563EB",
    fontWeight: 600,
    height: 44,
  },
  chevron: { display: "flex", transition: "transform 0.3s" },
  dropdownBox: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    width: 200,
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    overflow: "hidden",
    transition: "all 0.2s",
  },
  dropdownItem: {
    width: "100%",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    borderBottom: "1px solid #E5E7EB",
    cursor: "pointer",
    fontSize: 14,
    background: "transparent",
  },
  cartButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: "50%",
    background: "#0066FF",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
