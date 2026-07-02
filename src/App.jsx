import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FiShoppingCart, FiLoader } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";

// Global Alerts & UI
import GlobalAudioAlerts from "./components/GlobalAudioAlerts";
import { Toast, useToast } from "./components/ui/Toast";

// Components (Keep these static as they load on every page)
import Navbar from "./components/layout/Navbar";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegisterModal";
import ForgotPasswordModal from "./components/auth/ForgotPasswordModal";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/cart/CheckoutModal";
import Footer from "./components/layout/Footer";

// 🏆 UPGRADE 1: Lazy Loading Pages for Maximum Performance
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Cart = lazy(() => import("./pages/Cart"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Redeem = lazy(() => import("./pages/Redeem"));

// Simple Loader for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] text-blue-500">
    <FiLoader className="animate-spin" size={32} />
  </div>
);

function MainApp() {
  const { t } = useTranslation();
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

      {/* Main Content Container */}
      <main
        className="max-w-7xl mx-auto px-4 pt-6 flex-grow w-full relative z-10"
        style={{
          paddingBottom: count > 0 && !isAdminPage ? "100px" : "24px",
        }}
      >
        {/* 🏆 Suspense catches the lazy loaded pages while they fetch */}
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </main>

      {/* FOOTER */}
      {!isAdminPage && <Footer />}

      {/* 🏆 UPGRADE 2: Converted Floating Button to pure Tailwind CSS */}
      {!isAdminPage && count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-[99] bg-blue-600 text-white rounded-full px-6 py-4 flex items-center gap-3 text-base font-bold shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all duration-300 hover:scale-105 hover:-translate-y-1"
        >
          <FiShoppingCart size={22} />
          <span>{t("checkout.title", "Checkout")}</span>
          <div className="bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold">
            {count}
          </div>
        </button>
      )}

      {/* MODALS */}
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
          setAppliedVoucher(null);
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
            {/* 🏆 UPGRADE 3: overflow-x-hidden is the magic fix for the mobile white-gap bug! */}
            <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden w-full">
              <MainApp />
            </div>
          </BrowserRouter>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
