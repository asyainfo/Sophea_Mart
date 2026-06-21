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
} from "react-icons/fi";

import { supabase } from "../services/supabase";
import OrderDetailsModal from "../components/order/OrderDetailsModal";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { fmt, fmtKHR } from "../utils/currency";

import Button from "../components/ui/Button";
import ProductFormModal from "../components/product/ProductFormModal";
import ProductsTable from "../components/admin/ProductsTable";

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
  const { logout, profile } = useAuth();
  const { count = 0 } = useCart();

  const [tab, setTab] = useState("overview");

  // 🏆 NEW: ASYNC LOADING STATES
  const [processingId, setProcessingId] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [receiptImage, setReceiptImage] = useState(null);

  // Database State
  const [dbOrders, setDbOrders] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbRevenue, setDbRevenue] = useState(0);
  const [dbUsersCount, setDbUsersCount] = useState(0);

  // Bouncer: Kick out non-admins
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      triggerGlobalToast("Access Denied: Admins only.", "error");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  }, [profile]);

  // --- DATA FETCHING ---
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

      const totalRev = (ordersData || []).reduce((sum, order) => {
        if (order.status === "completed") {
          return sum + (order.total_usd || 0);
        }
        return sum;
      }, 0);

      setDbOrders(ordersData || []);
      setDbRevenue(totalRev);
      setDbUsersCount(usersCount || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error.message);
      triggerGlobalToast("Failed to load dashboard data", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setDbProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error.message);
      triggerGlobalToast("Failed to load products", "error");
    }
  };

  // UI Refresh Listener
  useEffect(() => {
    fetchDashboardData();
    fetchProducts();

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

  // --- ACTIONS (WITH LOADING SPINNERS) ---
  const toggleOrderStatus = async (
    orderId,
    currentStatus,
    orderUserId,
    totalUsd,
  ) => {
    setProcessingId(orderId); // 🏆 Start Spinner
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

        const currentPoints = profileData?.points || 0;
        const newPointsTotal = currentPoints + pointsToAward;

        await supabase
          .from("profiles")
          .update({ points: newPointsTotal })
          .eq("id", orderUserId);

        triggerGlobalToast(
          `🎉 Order completed! ${pointsToAward} points added.`,
          "success",
        );
      } else if (newStatus === "pending" && pointsToAward > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", orderUserId)
          .single();

        const currentPoints = profileData?.points || 0;
        const newPointsTotal = Math.max(0, currentPoints - pointsToAward);

        await supabase
          .from("profiles")
          .update({ points: newPointsTotal })
          .eq("id", orderUserId);

        triggerGlobalToast(
          `Order reverted to pending. Points deducted.`,
          "info",
        );
      } else {
        triggerGlobalToast(`Order updated to ${newStatus}`, "success");
      }

      fetchDashboardData();
    } catch (error) {
      console.error("Error updating status:", error.message);
      triggerGlobalToast("Failed to update status", "error");
    } finally {
      setProcessingId(null); // 🏆 Stop Spinner
    }
  };

  const handleAddProduct = async (productData) => {
    const { error } = await supabase.from("products").insert([productData]);
    if (error) {
      triggerGlobalToast(`Failed to add product: ${error.message}`, "error");
      throw error;
    }
    triggerGlobalToast("Product added successfully!", "success");
    fetchProducts();
  };

  const handleUpdateProduct = async (id, productData) => {
    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", id);

    if (error) {
      triggerGlobalToast(`Failed to update product: ${error.message}`, "error");
      throw error;
    }
    triggerGlobalToast("Product updated successfully!", "success");
    fetchProducts();
  };

  const handleDeleteProduct = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${name}?`,
    );
    if (!confirmDelete) return;

    setProcessingId(id); // 🏆 Start Spinner
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      triggerGlobalToast(`${name} deleted!`, "success");
      fetchProducts();
    } catch (error) {
      console.error("SUPABASE DELETE ERROR:", error);
      triggerGlobalToast("Failed to delete product", "error");
    } finally {
      setProcessingId(null); // 🏆 Stop Spinner
    }
  };

  const handleToggleStock = async (id, currentStockStatus, name) => {
    setProcessingId(id); // 🏆 Start Spinner
    try {
      const newStatus = !currentStockStatus;
      const { error } = await supabase
        .from("products")
        .update({ in_stock: newStatus })
        .eq("id", id);

      if (error) throw error;

      triggerGlobalToast(
        `${name} is now ${newStatus ? "In Stock" : "Hidden"}`,
        "success",
      );
      fetchProducts();
    } catch (error) {
      console.error("Error updating stock:", error);
      triggerGlobalToast("Failed to update stock status", "error");
    } finally {
      setProcessingId(null); // 🏆 Stop Spinner
    }
  };

  // --- COMPUTED STATS ---
  const stats = useMemo(
    () => [
      {
        label: "Total Products",
        value: dbProducts.length,
        icon: <FiBox size={24} />,
        color: "#dbeafe",
        textColor: "#1d4ed8",
      },
      {
        label: "Total Orders",
        value: dbOrders.length,
        icon: <FiShoppingCart size={24} />,
        color: "#d1fae5",
        textColor: "#065f46",
      },
      {
        label: "Total Revenue",
        value: fmt(dbRevenue),
        icon: <FiDollarSign size={24} />,
        color: "#fef9c3",
        textColor: "#713f12",
      },
      {
        label: "Total Users",
        value: dbUsersCount,
        icon: <FiUsers size={24} />,
        color: "#ede9fe",
        textColor: "#5b21b6",
      },
    ],
    [dbProducts.length, dbOrders.length, dbRevenue, dbUsersCount],
  );

  const recentOrders = useMemo(() => dbOrders.slice(0, 5), [dbOrders]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        fontFamily: "'Inter', sans-serif",
        paddingBottom: 40,
      }}
    >
      {/* Navbar */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "0 24px",
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
                }}
              >
                Sophea <span style={{ color: COLORS.primary }}>Mart</span>
              </div>
              <div
                style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500 }}
              >
                Admin Dashboard
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button
              small
              variant="secondary"
              onClick={() => (window.location.href = "/")}
            >
              <FiArrowLeft size={14} /> Back Store
            </Button>
            <Button small variant="danger" onClick={logout}>
              <FiLogOut size={14} /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: COLORS.primary,
          color: "#fff",
          padding: "30px 24px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
              }}
            >
              <FiSettings size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24 }}>Admin Dashboard</h1>
              <p style={{ margin: 0, opacity: 0.85 }}>
                Manage products, orders, and users
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {["overview", "products", "orders"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? COLORS.primary : "rgba(255,255,255,0.8)",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        {/* --- OVERVIEW TAB --- */}
        {tab === "overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 18,
                marginBottom: 30,
              }}
            >
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
                <h3 style={{ margin: 0 }}>Recent Orders</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
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
                        "Order",
                        "Date",
                        "Payment",
                        "Total",
                        "Status",
                        "Action",
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
                                <FiImage size={12} /> View Receipt
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
                              Items
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
                          No recent orders.
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
              }}
            >
              <h2 style={{ margin: 0 }}>Products ({dbProducts.length})</h2>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddModal(true);
                }}
              >
                <FiPlus size={14} /> Add Product
              </Button>
            </div>

            {/* 🏆 NEW: passing the processingId to the table! */}
            <ProductsTable
              products={dbProducts}
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
              }}
            >
              <h3 style={{ margin: 0 }}>All Orders ({dbOrders.length})</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
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
                      "Order ID",
                      "Date",
                      "Payment",
                      "Items",
                      "USD",
                      "KHR",
                      "Status",
                      "Details",
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
                  {dbOrders.map((o) => (
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
                            <FiImage size={12} /> View Receipt
                          </button>
                        )}
                      </td>
                      <td style={tableCell}>{o.total_items} items</td>
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
                              processingId === o.id ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap",
                            textTransform: "capitalize",
                            background:
                              o.status === "completed" ? "#d1fae5" : "#fef9c3",
                            color:
                              o.status === "completed" ? "#065f46" : "#713f12",
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
                          View Items
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
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
            if (editingProduct) {
              await handleUpdateProduct(editingProduct.id, data);
            } else {
              await handleAddProduct(data);
            }
            setShowAddModal(false);
            setEditingProduct(null);
          } catch (error) {
            // Handled inside functions
          } finally {
            setIsSavingProduct(false);
          }
        }}
      />

      {/* --- CONNECTED MODAL WITH SECURITY FLAG --- */}
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

      {/* --- QUICK VIEW RECEIPT LIGHTBOX MODAL --- */}
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
              <FiX size={24} /> Close
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
