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
  FiPackage, // <-- Added this icon for the orders!
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

  return (
    <>
      {/* CSS injected to handle mobile responsiveness gracefully */}
      <style>{`
        @media (max-width: 640px) {
          .hide-on-mobile {
            display: none !important;
          }
          .btn-mobile {
            padding: 0 12px !important;
            gap: 4px !important;
          }
          .nav-container-mobile {
            padding: 0 12px !important;
          }
          .logo-text-mobile {
            font-size: 16px !important;
          }
          .action-gap-mobile {
            gap: 8px !important;
          }
        }
      `}</style>

      <nav
        className="nav-container-mobile"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 300,
          background: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          boxShadow: "0 1px 8px rgba(161, 161, 161, 0.04)",
          backdropFilter: "blur(8px)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 70,
          }}
        >
          {/* Logo - Navigates to Home */}
          <div
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <img
              src="/Sophea Mart no1.png"
              alt="Sophea Mart Logo"
              style={{
                width: 44, // Slightly smaller to save space
                height: 44,
                borderRadius: 12,
                objectFit: "cover",
              }}
            />

            <span
              className="logo-text-mobile"
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "#111827",
                whiteSpace: "nowrap",
              }}
            >
              SOPHEA <span style={{ color: "#0066FF" }}>MART</span>
            </span>
          </div>

          {/* Actions */}
          <div
            className="action-gap-mobile"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
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
                {/* THE NEW ADMIN DOOR */}
                {profile?.role === "admin" && (
                  <button
                    className="btn-mobile"
                    onClick={() => navigate("/admin")}
                    style={{
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
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#1D4ED8")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#2563EB")
                    }
                  >
                    <FiSettings size={18} />
                    {/* Text hidden on small screens */}
                    <span className="hide-on-mobile">Admin Panel</span>
                  </button>
                )}

                <div style={{ position: "relative" }} ref={dropdownRef}>
                  <button
                    className="btn-mobile"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    style={{
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
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#DBEAFE")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#EFF6FF")
                    }
                  >
                    <FiUser size={18} />
                    {/* Text hidden on small screens */}
                    <span className="hide-on-mobile">{firstName}</span>
                    <div
                      style={{
                        display: "flex",
                        transition: "transform 0.3s ease",
                        transform: profileOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <FiChevronDown size={16} />
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 8,
                      width: 160,
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      zIndex: 400,
                      transition: "all 0.2s ease-in-out",
                      opacity: profileOpen ? 1 : 0,
                      visibility: profileOpen ? "visible" : "hidden",
                      transform: profileOpen
                        ? "translateY(0)"
                        : "translateY(-10px)",
                      pointerEvents: profileOpen ? "auto" : "none",
                    }}
                  >
                    {/* --- NEW MY ORDERS BUTTON --- */}
                    <button
                      onClick={() => {
                        navigate("/order-history");
                        setProfileOpen(false);
                      }}
                      style={{
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
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#F3F4F6";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <FiPackage size={16} />
                      My Orders
                    </button>

                    <button
                      onClick={handleAddAccount}
                      style={{
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
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#F3F4F6";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <FiPlus size={16} />
                      Add Account
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "transparent",
                        border: "none",
                        cursor: isLoggingOut ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#DC2626",
                        textAlign: "left",
                        opacity: isLoggingOut ? 0.7 : 1,
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) => {
                        if (!isLoggingOut) {
                          e.currentTarget.style.background = "#FEF2F2";
                        }
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

            {/* Cart Icon - OPENS THE DRAWER NOW! */}
            <button
              onClick={onCartOpen}
              style={{
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
                flexShrink: 0, // Prevents cart from ever squishing
              }}
            >
              <FiShoppingCart size={20} />
              {count > 0 && (
                <span
                  style={{
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
                  }}
                >
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
