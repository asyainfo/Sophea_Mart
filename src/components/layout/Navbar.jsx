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
  FiAward, // <-- Icon for the new Rewards button
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

  const displayName =
    user?.user_metadata?.display_name || user?.email || "User";
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
    const confirm = window.confirm("Are you sure you want to log out?");
    if (!confirm) return;

    setIsLoggingOut(true);

    try {
      await logout();
      setProfileOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
      alert("Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddAccount = () => {
    setProfileOpen(false);
    onRegister();
  };

  const handleNavigation = (path) => {
    navigate(path);
    setProfileOpen(false);
  };

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .hide-on-mobile { display: none !important; }
          .btn-mobile { padding: 0 12px !important; gap: 4px !important; }
          .nav-container-mobile { padding: 0 12px !important; }
          .logo-text-mobile { font-size: 16px !important; }
          .action-gap-mobile { gap: 8px !important; }
        }
      `}</style>

      <nav className="nav-container-mobile" style={styles.navBar}>
        <div style={styles.innerContainer}>
          {/* Logo Section */}
          <div onClick={() => navigate("/")} style={styles.logoWrapper}>
            <img
              src="/Sophea Mart no1.png"
              alt="Sophea Mart Logo"
              style={styles.logoImage}
            />
            <span className="logo-text-mobile" style={styles.logoText}>
              SOPHEA <span style={{ color: "#0066FF" }}>MART</span>
            </span>
          </div>

          {/* Actions Section */}
          <div className="action-gap-mobile" style={styles.actionsWrapper}>
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
                {/* Admin Button */}
                {profile?.role === "admin" && (
                  <button
                    className="btn-mobile"
                    onClick={() => navigate("/admin")}
                    style={styles.adminButton}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#1D4ED8")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#2563EB")
                    }
                  >
                    <FiSettings size={18} />
                    <span className="hide-on-mobile">Admin Panel</span>
                  </button>
                )}

                {/* Profile Dropdown Toggle */}
                <div style={{ position: "relative" }} ref={dropdownRef}>
                  <button
                    className="btn-mobile"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    style={styles.profileButton}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#DBEAFE")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#EFF6FF")
                    }
                  >
                    <FiUser size={18} />
                    <span className="hide-on-mobile">{firstName}</span>
                    <div
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

                  {/* Dropdown Menu Box */}
                  <div
                    style={{
                      ...styles.dropdownBox,
                      opacity: profileOpen ? 1 : 0,
                      visibility: profileOpen ? "visible" : "hidden",
                      transform: profileOpen
                        ? "translateY(0)"
                        : "translateY(-10px)",
                      pointerEvents: profileOpen ? "auto" : "none",
                    }}
                  >
                    <button
                      onClick={() => handleNavigation("/order-history")}
                      style={styles.dropdownItem}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#F3F4F6")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <FiPackage size={16} /> My Orders
                    </button>

                    <button
                      onClick={() => handleNavigation("/favorites")}
                      style={styles.dropdownItem}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#F3F4F6")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <FiHeart size={16} /> Saved Items
                    </button>

                    {/* --- 🎁 NEW: Rewards & Points Link --- */}
                    <button
                      onClick={() => handleNavigation("/redeem")}
                      style={{
                        ...styles.dropdownItem,
                        color: "#0066FF",
                        fontWeight: 600,
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f2f7feff")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <FiAward size={16} /> Rewards & Points
                    </button>

                    <button
                      onClick={handleAddAccount}
                      style={styles.dropdownItem}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#F3F4F6")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <FiPlus size={16} /> Add Account
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      style={{
                        ...styles.dropdownItem,
                        color: "#DC2626",
                        cursor: isLoggingOut ? "not-allowed" : "pointer",
                        opacity: isLoggingOut ? 0.7 : 1,
                      }}
                      onMouseOver={(e) => {
                        if (!isLoggingOut)
                          e.currentTarget.style.background = "#FEF2F2";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {isLoggingOut ? (
                        <FiLoader size={16} className="animate-spin" />
                      ) : (
                        <FiLogOut size={16} />
                      )}
                      {isLoggingOut ? "Logging out..." : "Log Out"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Cart Icon */}
            <button onClick={onCartOpen} style={styles.cartButton}>
              <FiShoppingCart size={20} />
              {count > 0 && (
                <span style={styles.cartBadge}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

// --- EXTRACTED STYLES FOR CLEANLINESS ---
const styles = {
  navBar: {
    position: "sticky",
    top: 0,
    zIndex: 300,
    background: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
    boxShadow: "0 1px 8px rgba(161, 161, 161, 0.04)",
    backdropFilter: "blur(8px)",
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
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    objectFit: "cover",
  },
  logoText: {
    fontWeight: 700,
    fontSize: 20,
    color: "#111827",
    whiteSpace: "nowrap",
  },
  actionsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  adminButton: {
    background: "#2563EB",
    color: "white",
    border: "none",
    padding: "0 16px",
    borderRadius: "9999px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 44,
    whiteSpace: "nowrap",
    transition: "background 0.2s ease",
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
    fontSize: 14,
    height: 44,
    whiteSpace: "nowrap",
    transition: "background 0.2s ease",
  },
  dropdownBox: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    width: 200, // <-- Made wider to fit the new text perfectly
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    overflow: "hidden",
    zIndex: 400,
    transition: "all 0.2s ease-in-out",
  },
  dropdownItem: {
    width: "100%",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #E5E7EB",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    textAlign: "left",
    transition: "background 0.2s",
  },
  cartButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#2563EB",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
