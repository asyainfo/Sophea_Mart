import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";

// Global Alerts & UI
import GlobalAudioAlerts from "./components/GlobalAudioAlerts";
import { Toast, useToast } from "./components/ui/Toast";

// Pages
import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import Redeem from "./pages/Redeem";

// Components
import Navbar from "./components/layout/Navbar";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";
import ForgotPasswordModal from "./components/auth/ForgotPasswordModal";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/cart/CheckoutModal";

function MainApp() {
  const { profile } = useAuth();
  const { toasts, show: toast } = useToast();
  const location = useLocation();
  const { count = 0 } = useCart();

  // --- UI STATE ---
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // --- VOUCHER STATE ---
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const isAdminPage = location.pathname.startsWith("/admin");

  // --- GLOBAL EVENT LISTENER ---
  useEffect(() => {
    const handleGlobalToast = (e) => {
      if (toast && e.detail) {
        toast(e.detail.message, e.detail.type);
      }
    };

    window.addEventListener("global-toast", handleGlobalToast);
    return () => window.removeEventListener("global-toast", handleGlobalToast);
  }, [toast]);

  return (
    <>
      <GlobalAudioAlerts />

      {!isAdminPage && (
        <Navbar
          onLogin={() => setLoginOpen(true)}
          onRegister={() => setRegisterOpen(true)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      {/* 🏆 THE FIX: Dynamic bottom padding prevents the floating button from hiding content */}
      <main
        className="max-w-7xl mx-auto px-4 pt-6"
        style={{
          paddingBottom: count > 0 && !isAdminPage ? "100px" : "24px",
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/update-password" element={<ResetPassword />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route
            path="/cart"
            element={<Cart onCheckout={() => setCheckoutOpen(true)} />}
          />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* --- FLOATING CHECKOUT BUTTON --- */}
      {!isAdminPage && count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          style={styles.floatingButton}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05) translateY(-5px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1) translateY(0)")
          }
        >
          <FiShoppingCart size={22} />
          <span>Checkout</span>
          <div style={styles.floatingBadge}>{count}</div>
        </button>
      )}

      {/* --- DRAWERS & MODALS --- */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={(voucher) => {
          setAppliedVoucher(voucher);
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        toast={toast}
        onSwitchRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        onSwitchForgot={() => {
          setLoginOpen(false);
          setForgotOpen(true);
        }}
      />

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        toast={toast}
        onSwitchLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        toast={toast}
        onSwitchLogin={() => {
          setForgotOpen(false);
          setLoginOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setAppliedVoucher(null); // Clear voucher on cancel
        }}
        toast={toast}
        appliedVoucher={appliedVoucher}
      />

      <Toast toasts={toasts} />
    </>
  );
}

// Ensure Context Providers wrap the entire app
export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <CartProvider>
          <BrowserRouter>
            <MainApp />
          </BrowserRouter>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

// ==========================================
// EXTRACTED STYLES
// ==========================================
const styles = {
  floatingButton: {
    position: "fixed",
    bottom: "24px", // Adjusted slightly for better mobile feel
    right: "24px",
    zIndex: 99,
    background: "#2563EB",
    color: "#ffffff",
    border: "none",
    borderRadius: "50px",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(37, 99, 235, 0.35)",
    transition: "all 0.3s ease",
  },
  floatingBadge: {
    background: "#ffffff",
    color: "#2563EB",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
  },
};
