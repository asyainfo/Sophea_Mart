import { useState, useMemo, useEffect } from "react";
import {
  FiBox,
  FiDollarSign,
  FiUsers,
  FiShoppingCart,
  FiSettings,
  FiArrowLeft,
  FiLogOut,
  FiPlus,
  FiImage,
  FiX,
  FiTrendingUp,
  FiAward,
  FiGift,
  FiUploadCloud,
  FiMaximize, // 🏆 Imported for the scanner icon
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "../services/supabase";
import { adminApi } from "../services/adminApi";
import OrderDetailsModal from "../components/order/OrderDetailsModal";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { fmt, fmtKHR } from "../utils/currency";

import Button from "../components/ui/Button";
import ProductFormModal from "../components/product/ProductFormModal";
import ProductsTable from "../components/admin/ProductsTable";
import CustomerDebts from "../components/admin/CustomerCredits";
import BarcodeScanner from "../components/scanner/BarcodeScanner"; // 🏆 Imported Scanner
import { useTranslation } from "react-i18next";

const COLORS = {
  primary: "#0066FF",
  background: "#f9fafb",
  border: "#f3f4f6",
  text: "#111827",
  muted: "#6b7280",
};

const tableCell = {
  padding: "12px 16px",
  fontSize: 13,
  verticalAlign: "middle",
};

// --- GLOBAL TOAST DISPATCHER ---
const triggerGlobalToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { logout, profile } = useAuth();
  const { count = 0 } = useCart();

  const [tab, setTab] = useState("overview");

  // ASYNC LOADING STATES
  const [processingId, setProcessingId] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Modals & Scanner State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [receiptImage, setReceiptImage] = useState(null);
  const [showAdminScanner, setShowAdminScanner] = useState(false); // 🏆 Added Scanner State

  // Database State
  const [dbOrders, setDbOrders] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbRevenue, setDbRevenue] = useState(0);
  const [dbUsersCount, setDbUsersCount] = useState(0);

  // Store Settings & Gifts State
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [dbGifts, setDbGifts] = useState([]);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const [newGift, setNewGift] = useState({ name: "" });
  const [giftImageFile, setGiftImageFile] = useState(null);
  const [giftImagePreview, setGiftImagePreview] = useState(null);

  const [isSavingGift, setIsSavingGift] = useState(false);
  const [processingGiftId, setProcessingGiftId] = useState(null);

  // Chart & Top Items State
  const [chartData, setChartData] = useState([]);
  const [topItems, setTopItems] = useState([]);

  // Payment Filter State
  const [paymentFilter, setPaymentFilter] = useState("all");

  // ROLE-BASED ACCESS CONTROL
  const isAdmin = profile?.role === "admin";
  const isStaff = isAdmin || profile?.role === "cashier";

  useEffect(() => {
    if (profile && !isStaff) {
      triggerGlobalToast(
        t("admin.toasts.access_denied", "Access Denied: Staff only."),
        "error",
      );
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  }, [profile, isStaff, t]);

  // --- DASHBOARD DATA FETCHING ---
  const fetchDashboardData = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("Orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) console.error("Error fetching profiles:", usersError);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*");

      if (itemsError) console.error("Error fetching items:", itemsError);

      const safeOrders = ordersData || [];

      const totalRev = safeOrders.reduce((sum, order) => {
        if (order.status === "completed") return sum + (order.total_usd || 0);
        return sum;
      }, 0);

      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const generatedChartData = last7Days.map((date) => {
        const dayTotal = safeOrders
          .filter(
            (o) => o.status === "completed" && o.created_at.startsWith(date),
          )
          .reduce((sum, o) => sum + (o.total_usd || 0), 0);

        const displayDate = new Date(date).toLocaleDateString(
          i18n.language === "km" ? "km-KH" : "en-US",
          {
            month: "short",
            day: "numeric",
          },
        );
        return { name: displayDate, Revenue: dayTotal };
      });

      const completedOrderIds = new Set(
        safeOrders.filter((o) => o.status === "completed").map((o) => o.id),
      );
      const itemSales = {};

      (itemsData || []).forEach((item) => {
        if (completedOrderIds.has(item.order_id)) {
          const productName = item.product_name || "Unknown Product";
          const quantity = parseInt(item.quantity) || 0;

          if (!itemSales[productName]) {
            itemSales[productName] = { name: productName, qty: 0, revenue: 0 };
          }

          itemSales[productName].qty += quantity;
          itemSales[productName].revenue += quantity * item.price;
        }
      });

      const generatedTopItems = Object.values(itemSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setDbOrders(safeOrders);
      setDbRevenue(totalRev);
      setDbUsersCount(usersCount || 0);
      setChartData(generatedChartData);
      setTopItems(generatedTopItems);
    } catch (error) {
      console.error("Error fetching dashboard data:", error.message);
      triggerGlobalToast(
        t(
          "admin.toasts.failed_load_dashboard",
          "Failed to load dashboard data",
        ),
        "error",
      );
    }
  };

  const fetchSettings = async () => {
    const { value } = await adminApi.getSetting("enable_promotions");
    setPromotionsEnabled(value);
  };

  const fetchGifts = async () => {
    const { data, error } = await adminApi.fetchGifts();
    if (!error) setDbGifts(data || []);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProducts();
    fetchSettings();
    fetchGifts();

    const channel = supabase
      .channel("admin-dashboard-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Orders" },
        () => fetchDashboardData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ==========================================
  // STANDARDIZED API CALLS
  // ==========================================

  const fetchProducts = async () => {
    const { data, error } = await adminApi.fetchProducts();
    if (error) {
      triggerGlobalToast(
        t("admin.toasts.failed_load_products", "Failed to load products"),
        "error",
      );
    } else {
      setDbProducts(data || []);
    }
  };

  const handleAddProduct = async (productData) => {
    if (!isAdmin) return;
    const { error } = await adminApi.addProduct(productData);
    if (error) {
      triggerGlobalToast(`Failed: ${error.message}`, "error");
      throw error;
    }
    triggerGlobalToast(
      t("admin.toasts.product_added", "Product added successfully!"),
      "success",
    );
    fetchProducts();
  };

  const handleUpdateProduct = async (id, productData) => {
    if (!isAdmin) return;
    const { error } = await adminApi.updateProduct(id, productData);
    if (error) {
      triggerGlobalToast(`Failed: ${error.message}`, "error");
      throw error;
    }
    triggerGlobalToast(
      t("admin.toasts.product_updated", "Product updated successfully!"),
      "success",
    );
    fetchProducts();
  };

  const handleDeleteProduct = async (id, name) => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${name}?`,
    );
    if (!confirmDelete) return;

    setProcessingId(id);
    const { error } = await adminApi.deleteProduct(id);

    if (error) {
      triggerGlobalToast(
        t("admin.toasts.failed_delete_product", "Failed to delete product"),
        "error",
      );
    } else {
      triggerGlobalToast(
        `${name} ${t("admin.toasts.deleted", "deleted!")}`,
        "success",
      );
      fetchProducts();
    }
    setProcessingId(null);
  };

  const handleToggleStock = async (id, currentStockStatus, name) => {
    setProcessingId(id);
    const { newStatus, error } = await adminApi.toggleStock(
      id,
      currentStockStatus,
    );

    if (error) {
      triggerGlobalToast(
        t("admin.toasts.failed_stock", "Failed to update stock status"),
        "error",
      );
    } else {
      const statusText = newStatus
        ? t("admin.toasts.in_stock", "In Stock")
        : t("admin.toasts.hidden", "Hidden");
      triggerGlobalToast(
        `${name} ${t("admin.toasts.is_now", "is now")} ${statusText}`,
        "success",
      );
      fetchProducts();
    }
    setProcessingId(null);
  };

  const handleTogglePromotions = async () => {
    setIsLoadingSettings(true);
    const newValue = !promotionsEnabled;
    const { success } = await adminApi.updateSetting(
      "enable_promotions",
      newValue,
    );

    if (success) {
      setPromotionsEnabled(newValue);
      const onOff = newValue
        ? t("admin.toasts.on", "ON")
        : t("admin.toasts.off", "OFF");
      triggerGlobalToast(
        `${t("admin.toasts.promotions_now", "Promotions are now")} ${onOff}`,
        "success",
      );
    } else {
      triggerGlobalToast(
        t("admin.toasts.failed_settings", "Failed to update settings"),
        "error",
      );
    }
    setIsLoadingSettings(false);
  };

  // --- GIFT ACTIONS ---
  const handleAddGift = async () => {
    if (!newGift.name)
      return triggerGlobalToast(
        t("admin.toasts.gift_name_req", "Gift name is required"),
        "error",
      );
    setIsSavingGift(true);

    let finalImageUrl = "";

    if (giftImageFile) {
      const { url, error } = await adminApi.uploadGiftImage(giftImageFile);
      if (error) {
        triggerGlobalToast(
          t("admin.toasts.failed_upload", "Failed to upload image"),
          "error",
        );
        setIsSavingGift(false);
        return;
      }
      finalImageUrl = url;
    }

    const { error } = await adminApi.addGift({
      name: newGift.name,
      image_url: finalImageUrl,
    });
    setIsSavingGift(false);

    if (error) {
      triggerGlobalToast(
        t("admin.toasts.failed_add_gift", "Failed to add gift"),
        "error",
      );
    } else {
      triggerGlobalToast(
        t("admin.toasts.gift_added", "Gift added successfully!"),
        "success",
      );
      setShowGiftModal(false);
      setNewGift({ name: "" });
      setGiftImageFile(null);
      setGiftImagePreview(null);
      fetchGifts();
    }
  };

  const handleDeleteGift = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    setProcessingGiftId(id);
    const { error } = await adminApi.deleteGift(id);
    setProcessingGiftId(null);

    if (error) {
      triggerGlobalToast(
        t("admin.toasts.failed_delete_gift", "Failed to delete gift"),
        "error",
      );
    } else {
      triggerGlobalToast(
        `${name} ${t("admin.toasts.removed", "removed!")}`,
        "success",
      );
      fetchGifts();
    }
  };

  // --- ORDER ACTIONS ---
  const toggleOrderStatus = async (
    orderId,
    currentStatus,
    orderUserId,
    totalUsd,
  ) => {
    setProcessingId(orderId);
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const pointsToAward = Math.floor((totalUsd || 0) / 1.25);

    try {
      const { error: orderError } = await supabase
        .from("Orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (orderError) throw orderError;

      if (newStatus === "completed" && pointsToAward > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", orderUserId)
          .single();
        const newPointsTotal = (profileData?.points || 0) + pointsToAward;
        await supabase
          .from("profiles")
          .update({ points: newPointsTotal })
          .eq("id", orderUserId);
        triggerGlobalToast(
          `🎉 ${t("admin.toasts.order_completed_points", "Order completed! Points added: ")}${pointsToAward}`,
          "success",
        );
      } else if (newStatus === "pending" && pointsToAward > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", orderUserId)
          .single();
        const newPointsTotal = Math.max(
          0,
          (profileData?.points || 0) - pointsToAward,
        );
        await supabase
          .from("profiles")
          .update({ points: newPointsTotal })
          .eq("id", orderUserId);
        triggerGlobalToast(
          t(
            "admin.toasts.order_reverted",
            "Order reverted to pending. Points deducted.",
          ),
          "info",
        );
      } else {
        triggerGlobalToast(
          `${t("admin.toasts.order_updated", "Order updated to")} ${newStatus}`,
          "success",
        );
      }
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating status:", error.message);
      triggerGlobalToast(
        t("admin.toasts.failed_status", "Failed to update status"),
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // --- COMPUTED STATS ---
  const stats = useMemo(() => {
    const baseStats = [
      {
        label: t("admin.stats.total_products", "Total Products"),
        value: dbProducts.length,
        icon: <FiBox size={24} />,
        color: "#dbeafe",
        textColor: "#1d4ed8",
      },
      {
        label: t("admin.stats.total_orders", "Total Orders"),
        value: dbOrders.length,
        icon: <FiShoppingCart size={24} />,
        color: "#d1fae5",
        textColor: "#065f46",
      },
    ];

    if (isAdmin) {
      baseStats.push({
        label: t("admin.stats.total_revenue", "Total Revenue"),
        value: fmt(dbRevenue),
        icon: <FiDollarSign size={24} />,
        color: "#fef9c3",
        textColor: "#713f12",
      });
      baseStats.push({
        label: t("admin.stats.total_users", "Total Users"),
        value: dbUsersCount,
        icon: <FiUsers size={24} />,
        color: "#ede9fe",
        textColor: "#5b21b6",
      });
    }
    return baseStats;
  }, [dbProducts.length, dbOrders.length, dbRevenue, dbUsersCount, isAdmin, t]);

  const recentOrders = useMemo(() => dbOrders.slice(0, 5), [dbOrders]);

  const filteredOrders = useMemo(() => {
    if (paymentFilter === "all") return dbOrders;
    return dbOrders.filter(
      (o) => (o.payment_method || "cash").toLowerCase() === paymentFilter,
    );
  }, [dbOrders, paymentFilter]);

  const filteredOrdersRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      if (order.status === "completed") return sum + (order.total_usd || 0);
      return sum;
    }, 0);
  }, [filteredOrders]);

  const availableTabs = [
    "overview",
    "products",
    "orders",
    "credits",
    isAdmin ? "settings" : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        fontFamily: "'Inter', sans-serif",
        paddingBottom: 40,
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      <style>
        {`
          .admin-tabs-scroll { 
            display: flex;
            gap: 8px;
            width: 100%;
            overflow-x: auto; 
            white-space: nowrap; 
            scrollbar-width: none; 
            -ms-overflow-style: none;
            padding-bottom: 2px;
          }
          .admin-tabs-scroll::-webkit-scrollbar { display: none; }
          .admin-tabs-scroll button { flex-shrink: 0; }

          .admin-nav-padding { padding: 0 24px; }
          .admin-hero-padding { padding: 30px 24px; }
          .admin-content-padding { padding: 24px; }
          .hide-mobile-text { margin-left: 6px; }
          
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            gap: 18px; 
            margin-bottom: 30px; 
          }
          .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 30px;
          }

          @media (max-width: 640px) {
            .hide-mobile-text { display: none !important; }
            .admin-nav-padding { padding: 0 16px !important; }
            .admin-hero-padding { padding: 24px 16px !important; }
            .admin-content-padding { padding: 16px !important; }
            .stats-grid { grid-template-columns: 1fr !important; }
            .charts-grid { grid-template-columns: 1fr !important; }
            .mobile-icon-btn { padding: 8px 12px !important; }
          }
        `}
      </style>

      {/* Navbar */}
      <div
        className="admin-nav-padding"
        style={{
          background: "#fff",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/Sophea Mart no1.png"
              alt="Logo"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                objectFit: "cover",
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: COLORS.text,
                  textTransform: "uppercase",
                  letterSpacing: "-0.5px",
                }}
              >
                Sophea <span style={{ color: COLORS.primary }}>Mart</span>
              </div>
              <div
                style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500 }}
              >
                {isAdmin
                  ? t("nav.admin_dashboard", "Admin Dashboard")
                  : t("nav.cashier_portal", "Cashier Portal")}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button
              small
              variant="secondary"
              onClick={() => (window.location.href = "/")}
              className="mobile-icon-btn"
              style={{ display: "flex", alignItems: "center" }}
            >
              <FiArrowLeft size={16} />{" "}
              <span className="hide-mobile-text">
                {t("nav.back_store", "Back Store")}
              </span>
            </Button>
            <Button
              small
              variant="danger"
              onClick={logout}
              className="mobile-icon-btn"
              style={{ display: "flex", alignItems: "center" }}
            >
              <FiLogOut size={16} />{" "}
              <span className="hide-mobile-text">
                {t("nav.sign_out", "Sign Out")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        className="admin-hero-padding"
        style={{ background: COLORS.primary, color: "#fff" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiSettings size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>
                {isAdmin
                  ? t("admin.title", "Admin Dashboard")
                  : t("admin.cashier_title", "Cashier Station")}
              </h1>
              <p
                style={{ margin: 0, opacity: 0.85, fontSize: 14, marginTop: 4 }}
              >
                {isAdmin
                  ? t("admin.subtitle", "Manage products, orders, and users")
                  : t(
                      "admin.cashier_subtitle",
                      "Process orders and manage checkout",
                    )}
              </p>
            </div>
          </div>
          {/* Tabs */}
          <div className="admin-tabs-scroll">
            {availableTabs.map((tabName) => (
              <button
                key={tabName}
                type="button"
                onClick={() => setTab(tabName)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: tab === tabName ? "#fff" : "transparent",
                  color:
                    tab === tabName ? COLORS.primary : "rgba(255,255,255,0.8)",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {t(`admin.tabs.${tabName}`, tabName)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="admin-content-padding"
        style={{ maxWidth: 1200, margin: "0 auto" }}
      >
        {/* --- OVERVIEW TAB --- */}
        {tab === "overview" && (
          <>
            <div className="stats-grid">
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ background: s.color, borderRadius: 18, padding: 22 }}
                >
                  <div style={{ color: s.textColor }}>{s.icon}</div>
                  <h2
                    style={{
                      margin: "12px 0 4px",
                      fontSize: 26,
                      color: s.textColor,
                    }}
                  >
                    {s.value}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: s.textColor,
                      opacity: 0.8,
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="charts-grid">
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 18,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 20px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FiTrendingUp color={COLORS.primary} />{" "}
                    {t("admin.charts.last_7_days", "Last 7 Days Revenue")}
                  </h3>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E5E7EB"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "none",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value) => [fmt(value), "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="Revenue"
                          stroke={COLORS.primary}
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: COLORS.primary,
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 18,
                    border: `1px solid ${COLORS.border}`,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 20px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FiAward color="#F59E0B" />{" "}
                    {t("admin.charts.top_selling", "Top Selling Items")}
                  </h3>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    {topItems.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: COLORS.muted,
                          marginTop: 40,
                        }}
                      >
                        {t("admin.charts.no_sales_data", "No sales data yet.")}
                      </div>
                    ) : (
                      topItems.map((item, index) => (
                        <div
                          key={item.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            paddingBottom: 16,
                            borderBottom:
                              index !== topItems.length - 1
                                ? `1px solid ${COLORS.border}`
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: index === 0 ? "#FEF3C7" : "#F3F4F6",
                              color: index === 0 ? "#D97706" : COLORS.muted,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: COLORS.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.name}
                            </div>
                            <div style={{ fontSize: 12, color: COLORS.muted }}>
                              {item.qty}{" "}
                              {t("admin.charts.units_sold", "units sold")}
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: COLORS.primary,
                              fontSize: 14,
                            }}
                          >
                            {fmt(item.revenue)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                border: `1px solid ${COLORS.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {t("admin.overview_table.recent_orders", "Recent Orders")}
                </h3>
              </div>
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {[
                        t("admin.overview_table.order", "Order"),
                        t("admin.overview_table.date", "Date"),
                        t("admin.overview_table.payment", "Payment"),
                        t("admin.overview_table.total", "Total"),
                        t("admin.overview_table.status", "Status"),
                        t("admin.overview_table.action", "Action"),
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            ...tableCell,
                            textAlign: "left",
                            color: COLORS.muted,
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((o) => (
                        <tr
                          key={o.id}
                          style={{ borderTop: `1px solid ${COLORS.border}` }}
                        >
                          <td
                            style={{
                              ...tableCell,
                              color: COLORS.primary,
                              fontWeight: 700,
                            }}
                          >
                            {o.id}
                          </td>
                          <td style={tableCell}>
                            {new Date(o.created_at).toISOString().split("T")[0]}
                          </td>
                          <td style={tableCell}>
                            <div
                              style={{
                                fontWeight: 600,
                                textTransform: "capitalize",
                              }}
                            >
                              {o.payment_method || "cash"}
                            </div>
                            {o.payment_method === "bank" && o.receipt_url && (
                              <button
                                onClick={() => setReceiptImage(o.receipt_url)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "none",
                                  border: "none",
                                  color: COLORS.primary,
                                  padding: "2px 0",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                <FiImage size={12} />{" "}
                                {t(
                                  "admin.overview_table.view_receipt",
                                  "View Receipt",
                                )}
                              </button>
                            )}
                          </td>
                          <td style={{ ...tableCell, fontWeight: 700 }}>
                            {fmt(o.total_usd)}
                          </td>
                          <td style={tableCell}>
                            <button
                              onClick={() =>
                                toggleOrderStatus(
                                  o.id,
                                  o.status,
                                  o.user_id,
                                  o.total_usd,
                                )
                              }
                              disabled={processingId === o.id}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                border: "none",
                                cursor:
                                  processingId === o.id
                                    ? "not-allowed"
                                    : "pointer",
                                whiteSpace: "nowrap",
                                textTransform: "capitalize",
                                background:
                                  o.status === "completed"
                                    ? "#d1fae5"
                                    : "#fef9c3",
                                color:
                                  o.status === "completed"
                                    ? "#065f46"
                                    : "#713f12",
                                opacity: processingId === o.id ? 0.6 : 1,
                              }}
                            >
                              {processingId === o.id ? "..." : o.status}
                            </button>
                          </td>
                          <td style={tableCell}>
                            <button
                              onClick={() => {
                                setSelectedOrderId(o.id);
                                setShowOrderModal(true);
                              }}
                              style={{
                                background: "#F3F4F6",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: 8,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t("admin.overview_table.items", "Items")}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            ...tableCell,
                            textAlign: "center",
                            color: COLORS.muted,
                          }}
                        >
                          {t(
                            "admin.overview_table.no_orders",
                            "No recent orders.",
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- PRODUCTS TAB --- */}
        {tab === "products" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <h2 style={{ margin: 0 }}>
                {t("admin.products_tab.title", "Products")} ({dbProducts.length}
                )
              </h2>

              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                {/* 🏆 THE NEW SCAN BUTTON */}
                <Button
                  variant="secondary"
                  onClick={() => setShowAdminScanner(true)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FiMaximize size={16} />
                  {t("admin.products_tab.scan", "Scan Barcode")}
                </Button>

                {isAdmin && (
                  <Button
                    onClick={() => {
                      setEditingProduct(null);
                      setShowAddModal(true);
                    }}
                  >
                    <FiPlus size={14} />{" "}
                    {t("admin.products_tab.add_product", "Add Product")}
                  </Button>
                )}
              </div>
            </div>

            <ProductsTable
              products={dbProducts}
              isAdmin={isAdmin}
              onEdit={(product) => {
                setEditingProduct(product);
                setShowAddModal(true);
              }}
              onDelete={handleDeleteProduct}
              onToggleStock={handleToggleStock}
              processingId={processingId}
            />
          </>
        )}

        {/* --- ORDERS TAB --- */}
        {tab === "orders" && (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {t("admin.orders_tab.all_orders", "All Orders")} (
                  {filteredOrders.length})
                </h3>
                {isAdmin && (
                  <div
                    style={{
                      padding: "6px 14px",
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiDollarSign size={14} />{" "}
                    {t("admin.orders_tab.collected", "Collected")}:{" "}
                    {fmt(filteredOrdersRevenue)}
                  </div>
                )}
              </div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  background: "#f9fafb",
                  width: "100%",
                  maxWidth: 300,
                }}
              >
                <option value="all">
                  {t(
                    "admin.orders_tab.all_payment_methods",
                    "All Payment Methods",
                  )}
                </option>
                <option value="cash">
                  {t("admin.orders_tab.cash_only", "💵 Cash Only")}
                </option>
                <option value="bank">
                  {t("admin.orders_tab.bank_only", "🏦 ABA KHQR / Bank")}
                </option>
              </select>
            </div>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 800,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      t("admin.orders_tab.order_id", "Order ID"),
                      t("admin.overview_table.date", "Date"),
                      t("admin.overview_table.payment", "Payment"),
                      t("admin.orders_tab.items_count", "Items"),
                      t("admin.orders_tab.usd", "USD"),
                      t("admin.orders_tab.khr", "KHR"),
                      t("admin.overview_table.status", "Status"),
                      t("admin.orders_tab.details", "Details"),
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          ...tableCell,
                          textAlign: "left",
                          color: COLORS.muted,
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: COLORS.muted,
                        }}
                      >
                        {t(
                          "admin.orders_tab.no_match",
                          "No orders match the selected payment method.",
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr
                        key={o.id}
                        style={{ borderTop: `1px solid ${COLORS.border}` }}
                      >
                        <td
                          style={{
                            ...tableCell,
                            color: COLORS.primary,
                            fontWeight: 600,
                          }}
                        >
                          {o.id}
                        </td>
                        <td style={tableCell}>
                          {new Date(o.created_at).toISOString().split("T")[0]}
                        </td>
                        <td style={tableCell}>
                          <div
                            style={{
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {o.payment_method || "cash"}
                          </div>
                          {o.payment_method === "bank" && o.receipt_url && (
                            <button
                              onClick={() => setReceiptImage(o.receipt_url)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                background: "none",
                                border: "none",
                                color: COLORS.primary,
                                padding: "2px 0",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <FiImage size={12} />{" "}
                              {t(
                                "admin.overview_table.view_receipt",
                                "View Receipt",
                              )}
                            </button>
                          )}
                        </td>
                        <td style={tableCell}>
                          {o.total_items} {t("store.items", "items")}
                        </td>
                        <td style={{ ...tableCell, fontWeight: 700 }}>
                          {fmt(o.total_usd)}
                        </td>
                        <td style={tableCell}>{fmtKHR(o.total_usd)}</td>
                        <td style={tableCell}>
                          <button
                            onClick={() =>
                              toggleOrderStatus(
                                o.id,
                                o.status,
                                o.user_id,
                                o.total_usd,
                              )
                            }
                            disabled={processingId === o.id}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              border: "none",
                              cursor:
                                processingId === o.id
                                  ? "not-allowed"
                                  : "pointer",
                              whiteSpace: "nowrap",
                              textTransform: "capitalize",
                              background:
                                o.status === "completed"
                                  ? "#d1fae5"
                                  : "#fef9c3",
                              color:
                                o.status === "completed"
                                  ? "#065f46"
                                  : "#713f12",
                              opacity: processingId === o.id ? 0.6 : 1,
                            }}
                          >
                            {processingId === o.id ? "..." : o.status}
                          </button>
                        </td>
                        <td style={tableCell}>
                          <button
                            onClick={() => {
                              setSelectedOrderId(o.id);
                              setShowOrderModal(true);
                            }}
                            style={{
                              background: "#DBEAFE",
                              color: "#1D4ED8",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 10,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("admin.orders_tab.view_items", "View Items")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- CREDITS TAB --- */}
        {tab === "credits" && (
          <div style={{ width: "100%", overflowX: "hidden" }}>
            <CustomerDebts
              onMarkAsPaid={(id) =>
                triggerGlobalToast(`Debt ${id} marked as paid!`, "success")
              }
            />
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {tab === "settings" && isAdmin && (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: `1px solid ${COLORS.border}`,
              padding: "30px 24px",
            }}
          >
            <h2
              style={{
                margin: "0 0 24px 0",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <FiSettings color={COLORS.primary} />{" "}
              {t("admin.settings_tab.title", "Store Configuration")}
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 0",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div>
                <h4
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: 16,
                    color: COLORS.text,
                  }}
                >
                  {t(
                    "admin.settings_tab.enable_promotions",
                    "Enable Free Gift Promotions",
                  )}
                </h4>
                <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>
                  {t(
                    "admin.settings_tab.enable_desc",
                    "Turn this ON to show the free gift selection popup to customers in their shopping cart.",
                  )}
                </p>
              </div>

              {/* iOS Style Toggle Switch */}
              <button
                onClick={handleTogglePromotions}
                disabled={isLoadingSettings}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  cursor: isLoadingSettings ? "not-allowed" : "pointer",
                  background: promotionsEnabled ? "#10B981" : "#D1D5DB",
                  position: "relative",
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                  opacity: isLoadingSettings ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: promotionsEnabled ? 26 : 2,
                    transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            {/* --- FREE GIFTS INVENTORY TABLE --- */}
            <div style={{ marginTop: 40 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: 18,
                      color: COLORS.text,
                    }}
                  >
                    {t(
                      "admin.settings_tab.inventory_title",
                      "Free Gifts Inventory",
                    )}
                  </h3>
                  <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>
                    {t(
                      "admin.settings_tab.inventory_desc",
                      "Manage the gifts that appear when customers reach the promotion threshold.",
                    )}
                  </p>
                </div>
                <Button onClick={() => setShowGiftModal(true)}>
                  <FiPlus size={14} />{" "}
                  {t("admin.settings_tab.add_gift", "Add Gift")}
                </Button>
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  overflow: "hidden",
                }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 400,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#f9fafb",
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <th
                          style={{
                            ...tableCell,
                            textAlign: "left",
                            color: COLORS.muted,
                          }}
                        >
                          {t("admin.settings_tab.image", "Image")}
                        </th>
                        <th
                          style={{
                            ...tableCell,
                            textAlign: "left",
                            color: COLORS.muted,
                          }}
                        >
                          {t("admin.settings_tab.gift_name", "Gift Name")}
                        </th>
                        <th
                          style={{
                            ...tableCell,
                            textAlign: "right",
                            color: COLORS.muted,
                          }}
                        >
                          {t("admin.settings_tab.action", "Action")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbGifts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              ...tableCell,
                              textAlign: "center",
                              color: COLORS.muted,
                              padding: 40,
                            }}
                          >
                            {t(
                              "admin.settings_tab.no_gifts",
                              'No gifts added yet. Click "Add Gift" to create one.',
                            )}
                          </td>
                        </tr>
                      ) : (
                        dbGifts.map((gift) => (
                          <tr
                            key={gift.id}
                            style={{
                              borderBottom: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <td style={tableCell}>
                              {gift.image_url ? (
                                <img
                                  src={gift.image_url}
                                  alt={gift.name}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                    border: `1px solid ${COLORS.border}`,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    background: "#F3F4F6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <FiGift color="#9CA3AF" />
                                </div>
                              )}
                            </td>
                            <td style={{ ...tableCell, fontWeight: 600 }}>
                              {gift.name}
                            </td>
                            <td style={{ ...tableCell, textAlign: "right" }}>
                              <button
                                onClick={() =>
                                  handleDeleteGift(gift.id, gift.name)
                                }
                                disabled={processingGiftId === gift.id}
                                style={{
                                  background: "#FEE2E2",
                                  color: "#DC2626",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  cursor:
                                    processingGiftId === gift.id
                                      ? "not-allowed"
                                      : "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  opacity:
                                    processingGiftId === gift.id ? 0.6 : 1,
                                }}
                              >
                                {processingGiftId === gift.id
                                  ? "..."
                                  : t("admin.settings_tab.remove", "Remove")}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isAdmin && (
        <ProductFormModal
          open={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          isSaving={isSavingProduct}
          onSave={async (data) => {
            setIsSavingProduct(true);
            try {
              if (editingProduct)
                await handleUpdateProduct(editingProduct.id, data);
              else await handleAddProduct(data);
              setShowAddModal(false);
              setEditingProduct(null);
            } catch (error) {
            } finally {
              setIsSavingProduct(false);
            }
          }}
        />
      )}

      {selectedOrderId && (
        <OrderDetailsModal
          open={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
          isAdmin={true}
        />
      )}

      {/* 🏆 THE NEW SCANNER MODAL & LOOKUP LOGIC */}
      {showAdminScanner && (
        <BarcodeScanner
          onClose={() => setShowAdminScanner(false)}
          onScanSuccess={(scannedText) => {
            setShowAdminScanner(false); // Close camera

            // Automatically find the product based on scanned barcode
            const foundProduct = dbProducts.find(
              (p) => p.barcode === scannedText,
            );

            if (foundProduct) {
              // Open the Edit Modal so you can see price/details!
              setEditingProduct(foundProduct);
              setShowAddModal(true);
            } else {
              triggerGlobalToast(
                `រកមិនឃើញផលិតផល / Product not found: ${scannedText}`,
                "error",
              );
            }
          }}
        />
      )}

      {/* --- ADD GIFT MODAL --- */}
      {showGiftModal && (
        <div
          onClick={() => {
            setShowGiftModal(false);
            setGiftImageFile(null);
            setGiftImagePreview(null);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17,24,39,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 400,
              padding: 24,
              position: "relative",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <button
              onClick={() => {
                setShowGiftModal(false);
                setGiftImageFile(null);
                setGiftImagePreview(null);
              }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#F3F4F6",
                border: "none",
                cursor: "pointer",
                color: COLORS.muted,
                padding: 8,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiX size={18} />
            </button>
            <h2
              style={{
                margin: "0 0 24px 0",
                fontSize: 20,
                color: COLORS.text,
                fontWeight: 700,
              }}
            >
              {t("admin.settings_tab.modal_title", "Add New Free Gift")}
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {t("admin.settings_tab.modal_image", "Gift Image")}
              </label>
              <div
                style={{
                  width: "100%",
                  height: 160,
                  border: `2px dashed ${COLORS.border}`,
                  borderRadius: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  background: "#FAFAFA",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setGiftImageFile(file);
                      setGiftImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                />

                {giftImagePreview ? (
                  <img
                    src={giftImagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <FiUploadCloud size={38} color="#9CA3AF" />
                    <span
                      style={{
                        color: "#2563EB",
                        background: "#EFF6FF",
                        padding: "6px 16px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {t("admin.settings_tab.choose_photo", "Choose a Photo")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {t("admin.settings_tab.modal_name", "Gift Name")}
              </label>
              <input
                type="text"
                value={newGift.name}
                onChange={(e) =>
                  setNewGift({ ...newGift, name: e.target.value })
                }
                placeholder={t(
                  "admin.settings_tab.placeholder_name",
                  "e.g. Free Snacks",
                )}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fff",
                }}
              />
            </div>

            <Button
              onClick={handleAddGift}
              disabled={isSavingGift}
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
              }}
            >
              {isSavingGift
                ? t("admin.settings_tab.saving", "Saving...")
                : t("admin.settings_tab.save_gift", "Save Gift")}
            </Button>
          </div>
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {receiptImage && (
        <div
          onClick={() => setReceiptImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setReceiptImage(null)}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 16,
              }}
            >
              <FiX size={24} /> {t("admin.misc.close", "Close")}
            </button>
            <img
              src={receiptImage}
              alt="Receipt"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 12,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                border: "3px solid #FFF",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
