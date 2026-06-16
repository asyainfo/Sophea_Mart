import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";

// Global Alerts (The Unstoppable Listener)
import GlobalAudioAlerts from "./components/GlobalAudioAlerts";

// Pages
import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";
import ResetPassword from "./pages/ResetPassword";

// Components
import Navbar from "./components/layout/Navbar";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";
import ForgotPasswordModal from "./components/auth/ForgotPasswordModal";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/cart/CheckoutModal";
import { Toast, useToast } from "./components/ui/Toast";

// Inner component to safely utilize the 'useLocation' hook
function MainApp() {
  const { profile } = useAuth();
  const { toasts, show: toast } = useToast();
  const location = useLocation();

  // Bring in the cart count
  const { count = 0 } = useCart();

  // Modal States
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Check if the current URL starts with "/admin"
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {/* 1. THIS IS THE FIX: The Global Listener runs silently on every page */}
      <GlobalAudioAlerts />

      {/* Navbar hides on Admin pages */}
      {!isAdminPage && (
        <Navbar
          onLogin={() => setLoginOpen(true)}
          onRegister={() => setRegisterOpen(true)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      {/* Main Page Routing */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/update-password" element={<ResetPassword />} />
          <Route
            path="/cart"
            element={<Cart onCheckout={() => setCheckoutOpen(true)} />}
          />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* --- STICKY CART (Hides on Admin pages or if empty) --- */}
      {!isAdminPage && count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
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
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05) translateY(-5px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1) translateY(0)")
          }
        >
          <FiShoppingCart size={22} />
          <span>Checkout</span>
          <div
            style={{
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
            }}
          >
            {count}
          </div>
        </button>
      )}

      {/* --- MODALS AND DRAWERS --- */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
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
        onClose={() => setCheckoutOpen(false)}
        toast={toast}
      />

      {/* Global Toast Notifications Container */}
      <Toast toasts={toasts} />
    </>
  );
}

// Global Application State Context Wrapper
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
