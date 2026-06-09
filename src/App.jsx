import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./hooks/useAuth";

import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import Cart from "./pages/Cart";
import Navbar from "./components/layout/Navbar";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/cart/CheckoutModal";
import { Toast, useToast } from "./components/ui/Toast";
import OrderHistory from "./pages/OrderHistory";

// Inner component to safely utilize the 'useLocation' hook
function MainApp() {
  const { profile } = useAuth();
  const { toasts, show: toast } = useToast();
  const location = useLocation();

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Check if the current URL starts with "/admin"
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <>
      {/* 1. The Navbar shows everywhere EXCEPT on the Admin Dashboard */}
      {!isAdminPage && (
        <Navbar
          onLogin={() => setLoginOpen(true)}
          onRegister={() => setRegisterOpen(true)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/order-history" element={<OrderHistory />} />

          {/* 2. Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route
            path="/cart"
            element={<Cart onCheckout={() => setCheckoutOpen(true)} />}
          />

          {/* 3. Admin Route - FIXED: Registered globally to resolve route resolution issues */}
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </main>

      {/* CartDrawer is placed globally so it stays active across view states */}
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
        /* ADDED THIS SWITCH */
        onSwitchRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        toast={toast}
        /* ADDED THIS SWITCH */
        onSwitchLogin={() => {
          setRegisterOpen(false);
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
          {/* BrowserRouter must wrap the component that uses 'useLocation' */}
          <BrowserRouter>
            <MainApp />
          </BrowserRouter>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
