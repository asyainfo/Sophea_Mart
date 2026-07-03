import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FiLoader } from "react-icons/fi";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";

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

// Lazy Loading Pages for Maximum Performance
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Cart = lazy(() => import("./pages/Cart"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Redeem = lazy(() => import("./pages/Redeem"));

// Simple Loader for Suspense
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-blue-500 gap-4">
    <FiLoader className="animate-spin" size={40} />
    <span className="text-gray-500 font-medium">Loading...</span>
  </div>
);

function MainApp() {
  const { toasts, show: toast } = useToast();
  const location = useLocation();

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
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12 flex-grow w-full relative z-10">
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
            <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden w-full">
              <MainApp />
            </div>
          </BrowserRouter>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
