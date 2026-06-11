import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./hooks/useAuth";

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
      {!isAdminPage && (
        <Navbar
          onLogin={() => setLoginOpen(true)}
          onRegister={() => setRegisterOpen(true)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

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
