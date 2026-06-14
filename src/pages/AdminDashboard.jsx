import { useState, useMemo, useEffect, useRef } from "react";
import {
  FiBox,
  FiDollarSign,
  FiUsers,
  FiShoppingCart,
  FiSettings,
  FiEdit2,
  FiTrash2,
  FiArrowLeft,
  FiLogOut,
  FiPlus,
} from "react-icons/fi";

import { supabase } from "../services/supabase";
import OrderDetailsModal from "../components/order/OrderDetailsModal";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { fmt, fmtKHR } from "../utils/currency";

import Button from "../components/ui/Button";
import ProductFormModal from "../components/product/ProductFormModal";
import { Toast, useToast } from "../components/ui/Toast";

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
};

export default function AdminDashboard() {
  const { logout, profile } = useAuth();
  const { count = 0 } = useCart();
  const { toasts, show: toast } = useToast();

  const [tab, setTab] = useState("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // --- NEW: Audio Reference for Mobile ---
  const audioRef = useRef(null);

  // --- Mobile Audio Unlocker ---
  // This plays and pauses the audio silently on the first screen tap so iOS/Android trusts it
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch((err) => console.log("Unlock pending...", err));
      }
      // Remove listeners once unlocked so it only happens once
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("touchstart", unlockAudio);
    document.addEventListener("click", unlockAudio);

    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // --- THE BOUNCER: KICK OUT NON-ADMINS ---
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      toast("Access Denied: Admins only.", "error");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  }, [profile, toast]);

  // --- DATABASE STATE ---
  const [dbOrders, setDbOrders] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbRevenue, setDbRevenue] = useState(0);
  const [dbUsersCount, setDbUsersCount] = useState(0);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // --- FETCH DATA FUNCTIONS ---
  const fetchDashboardData = async () => {
    setIsLoadingDB(true);
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
      toast("Failed to load dashboard data", "error");
    } finally {
      setIsLoadingDB(false);
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
      toast("Failed to load products", "error");
    }
  };

  // --- REALTIME LISTENER ---
  useEffect(() => {
    fetchDashboardData();
    fetchProducts();

    const channel = supabase
      .channel("admin-order-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Orders" },
        (payload) => {
          console.log("New Realtime Order Detected:", payload.new);

          toast(`🚨 New Order Received! ID: ${payload.new.id}`, "success");

          // Play the trusted mobile audio element!
          if (audioRef.current) {
            audioRef.current.currentTime = 0; // Reset to beginning
            audioRef.current
              .play()
              .catch((e) =>
                console.log(
                  "Mobile browser still blocked audio. Ensure you tap the screen first.",
                  e,
                ),
              );
          }

          fetchDashboardData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ORDER UPDATE FUNCTION ---
  const toggleOrderStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("Orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast(`Order updated to ${newStatus}`);
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating status:", error.message);
      toast("Failed to update status", "error");
    }
  };

  // --- PRODUCT CRUD FUNCTIONS ---
  const handleAddProduct = async (productData) => {
    try {
      const safeData = {
        ...productData,
        price: productData.price || 0,
        stock: productData.stock || 0,
      };

      const { error } = await supabase.from("products").insert([safeData]);
      if (error) throw error;

      toast("Product added successfully");
      fetchProducts();
    } catch (error) {
      console.error("SUPABASE INSERT ERROR:", error);
      toast(`Failed to add product: ${error.message}`, "error");
    }
  };

  const handleUpdateProduct = async (id, productData) => {
    try {
      const safeData = {
        ...productData,
        price: productData.price || 0,
        stock: productData.stock || 0,
      };

      const { error } = await supabase
        .from("products")
        .update(safeData)
        .eq("id", id);
      if (error) throw error;

      toast("Product updated successfully");
      fetchProducts();
    } catch (error) {
      console.error("SUPABASE UPDATE ERROR:", error);
      toast(`Failed to update product: ${error.message}`, "error");
    }
  };

  const handleDeleteProduct = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${name}?`,
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast(`${name} deleted`, "error");
      fetchProducts();
    } catch (error) {
      console.error("SUPABASE DELETE ERROR:", error);
      toast("Failed to delete product", "error");
    }
  };

  // --- STATS ---
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
        {/* Overview Tab */}
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
                      {["Order", "Date", "Items", "Total", "Status"].map(
                        (h) => (
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
                        ),
                      )}
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
                          <td style={tableCell}>{o.total_items} items</td>
                          <td style={{ ...tableCell, fontWeight: 700 }}>
                            {fmt(o.total_usd)}
                          </td>
                          <td style={tableCell}>
                            <button
                              onClick={() => toggleOrderStatus(o.id, o.status)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 20,
                                fontSize: 14,
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                                background:
                                  o.status === "completed"
                                    ? "#d1fae5"
                                    : "#fef9c3",
                                color:
                                  o.status === "completed"
                                    ? "#065f46"
                                    : "#713f12",
                              }}
                            >
                              {o.status}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
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

        {/* Products Tab (FULLY RESPONSIVE LAYOUT) */}
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

            <div style={{ display: "grid", gap: 16 }}>
              {dbProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  {/* Left Side: Image and Details Group */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flex: "1 1 250px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        background: "#f3f4f6",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={
                          p.image?.startsWith("http") ? p.image : `/${p.image}`
                        }
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.src = "/placeholder.png";
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 16,
                            color: COLORS.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </h4>
                        <span
                          style={{
                            background: "#f3f4f6",
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            color: COLORS.muted,
                          }}
                        >
                          {p.category}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: COLORS.muted,
                          fontSize: 14,
                        }}
                      >
                        Stock:{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text }}>
                          {p.stock}
                        </span>{" "}
                        • Price:{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text }}>
                          {fmt(p.price)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Action Buttons Group */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flex: "0 0 auto",
                    }}
                  >
                    <Button
                      small
                      variant="secondary"
                      onClick={() => {
                        setEditingProduct(p);
                        setShowAddModal(true);
                      }}
                    >
                      <FiEdit2 size={14} /> Edit
                    </Button>
                    <Button
                      small
                      variant="danger"
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                    >
                      <FiTrash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Orders Tab */}
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
                    {["Order ID", "Date", "Items", "USD", "KHR", "Status"].map(
                      (h) => (
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
                      ),
                    )}
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
                      <td style={tableCell}>{o.total_items}</td>
                      <td style={{ ...tableCell, fontWeight: 700 }}>
                        {fmt(o.total_usd)}
                      </td>
                      <td style={tableCell}>{fmtKHR(o.total_usd)}</td>
                      <td style={tableCell}>
                        <div style={{ display: "flex", gap: 8 }}>
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
                            View Details
                          </button>
                          <button
                            onClick={() => toggleOrderStatus(o.id, o.status)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              border: "none",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              background:
                                o.status === "completed"
                                  ? "#d1fae5"
                                  : "#fef9c3",
                              color:
                                o.status === "completed"
                                  ? "#065f46"
                                  : "#713f12",
                            }}
                          >
                            {o.status}
                          </button>
                        </div>
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
        onSave={(data) => {
          if (editingProduct) {
            handleUpdateProduct(editingProduct.id, data);
          } else {
            handleAddProduct(data);
          }
          setShowAddModal(false);
          setEditingProduct(null);
        }}
      />

      {selectedOrderId && (
        <OrderDetailsModal
          open={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
        />
      )}

      <Toast toasts={toasts} />

      {/* Hidden Mobile Audio Player */}
      <audio
        ref={audioRef}
        src="/admin-alert.wav"
        preload="auto"
        style={{ display: "none" }}
      />
    </div>
  );
}
