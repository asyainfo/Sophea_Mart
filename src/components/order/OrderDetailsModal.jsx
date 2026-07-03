import { useState, useEffect } from "react";
import {
  FiPackage,
  FiCheckCircle,
  FiImage,
  FiClock,
  FiPrinter,
} from "react-icons/fi";
import { supabase } from "../../services/supabase";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { fmt, fmtKHR } from "../../utils/currency";
import { useTranslation } from "react-i18next";

export default function OrderDetailsModal({ open, onClose, orderId }) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch the Order details
      const { data: orderData, error: orderError } = await supabase
        .from("Orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // 2. Fetch the Order Items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      let mergedItems = itemsData || [];

      // 🏆 3. THE FIX: Smart Image Fetching for Products AND Free Gifts
      if (mergedItems.length > 0) {
        // Separate standard items (have ID) and gifts (null ID)
        const productIds = mergedItems.map((i) => i.product_id).filter(Boolean);
        const giftNames = mergedItems
          .filter((i) => !i.product_id)
          .map((i) => i.product_name);

        let allProducts = [];
        let allGifts = [];

        // Fetch standard item images by ID
        if (productIds.length > 0) {
          const { data: idData } = await supabase
            .from("products")
            .select("id, name, image")
            .in("id", productIds);
          if (idData) allProducts = idData;
        }

        // Fetch gift images from the 'free_gifts' table matching the exact name
        if (giftNames.length > 0) {
          const { data: giftData } = await supabase
            .from("free_gifts")
            .select("name, image_url") // 🏆 Grabbing the correct column name!
            .in("name", giftNames);
          if (giftData) allGifts = giftData;
        }

        // Map the correct images back to the order items
        mergedItems = mergedItems.map((item) => {
          let matchedImage = null;

          if (item.product_id) {
            // It's a regular product
            const matchedProduct = allProducts.find(
              (p) => p.id === item.product_id,
            );
            if (matchedProduct) matchedImage = matchedProduct.image;
          } else if (item.product_name) {
            // It's a free gift - search case-insensitive
            const matchedGift = allGifts.find(
              (g) => g.name.toLowerCase() === item.product_name.toLowerCase(),
            );
            if (matchedGift) matchedImage = matchedGift.image_url; // 🏆 Assigning the image_url
          }

          return {
            ...item,
            image: matchedImage || item.image || item.product_image || null,
          };
        });
      }

      setItems(mergedItems);
    } catch (error) {
      console.error("Error fetching order details:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- PRINT FUNCTION ---
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={`${t("order_modal.order", "Order")} #${orderId || ""}`}
      >
        <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
          {t("order_modal.loading", "Loading details...")}
        </div>
      </Modal>
    );
  }

  if (!order) return null;

  return (
    <>
      {/* --- CSS FOR THERMAL PRINTING ONLY --- */}
      <style>
        {`
          @media screen {
            #thermal-receipt { display: none; }
          }
          @media print {
            body * {
              visibility: hidden;
            }
            #thermal-receipt, #thermal-receipt * {
              visibility: visible;
            }
            #thermal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm; /* Standard Thermal Width */
              margin: 0;
              padding: 0 10px;
              font-family: 'Courier New', Courier, monospace; /* Best for receipts */
              color: #000;
              font-size: 12px;
            }
            .r-center { text-align: center; }
            .r-bold { font-weight: bold; }
            .r-flex { display: flex; justify-content: space-between; }
            .r-line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .r-item-name { margin-bottom: 2px; font-size: 11px; }
            .r-item-calc { font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 6px; }
          }
        `}
      </style>

      {/* --- HIDDEN THERMAL RECEIPT LAYOUT --- */}
      <div id="thermal-receipt">
        <div className="r-center">
          <h2 style={{ margin: "10px 0 5px", fontSize: 18 }}>Sophea Mart</h2>
          <div>Phnom Penh, Cambodia</div>
          <div>Tel: +855 61 470 636</div>
          <div className="r-line"></div>
          <div className="r-bold">{t("order_modal.receipt", "RECEIPT")}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>
            {t("order_modal.order", "Order")} #{order.id} <br />
            {new Date(order.created_at).toLocaleString()}
          </div>
          <div className="r-line"></div>
        </div>

        <div>
          {items.map((item) => (
            <div key={item.id}>
              <div className="r-item-name">{item.product_name}</div>
              <div className="r-item-calc">
                <span>
                  {item.quantity} x {fmt(item.price)}
                </span>
                <span>{fmt(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="r-line"></div>
        <div className="r-flex r-bold" style={{ fontSize: 14 }}>
          <span>{t("order_modal.total_usd", "TOTAL USD")}</span>
          <span>{fmt(order.total_usd)}</span>
        </div>
        <div className="r-flex" style={{ fontSize: 12, marginTop: 4 }}>
          <span>{t("order_modal.total_khr", "TOTAL KHR")}</span>
          <span>{fmtKHR(order.total_usd)}</span>
        </div>

        <div className="r-line" style={{ marginTop: 12 }}></div>
        <div className="r-flex" style={{ fontSize: 11 }}>
          <span>{t("order_modal.payment_method", "Payment Method:")}</span>
          <span style={{ textTransform: "capitalize" }}>
            {order.payment_method || t("order_modal.cash", "Cash")}
          </span>
        </div>

        <div className="r-center" style={{ marginTop: 16, fontSize: 11 }}>
          {t("order_modal.thank_you_1", "Thank you for shopping with us!")}{" "}
          <br />
          {t("order_modal.thank_you_2", "សូមអរគុណ!")}
        </div>
      </div>

      {/* --- STANDARD MODAL UI --- */}
      <Modal
        open={open}
        onClose={onClose}
        title={`${t("order_modal.order", "Order")} #${order.id}`}
        wide
      >
        <div style={styles.container}>
          {/* --- LEFT COLUMN: PACKING LIST --- */}
          <div style={styles.column}>
            <div style={styles.sectionHeader}>
              <FiPackage size={18} color="#0066FF" />
              <h3 style={styles.sectionTitle}>
                {t("order_modal.items_purchased", "Items Purchased")}
              </h3>
              <span style={styles.badge}>
                {items.length} {t("store.items", "items")}
              </span>
            </div>

            <div style={styles.card}>
              <div style={styles.itemsList}>
                {items.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#9CA3AF",
                    }}
                  >
                    {t(
                      "order_modal.no_items",
                      "No items found for this order.",
                    )}
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} style={styles.itemRow}>
                      <div style={styles.imageBox}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.product_name}
                            style={styles.productImage}
                          />
                        ) : (
                          <FiPackage size={20} color="#9CA3AF" />
                        )}
                      </div>
                      <div style={styles.itemDetails}>
                        <div style={styles.itemName}>{item.product_name}</div>
                        <div style={styles.itemMeta}>
                          {fmt(item.price)} × {item.quantity}
                        </div>
                      </div>
                      <div style={styles.itemTotal}>
                        {fmt(item.price * item.quantity)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.totalsBox}>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>
                    {t("order_modal.total_usd", "Total USD")}
                  </span>
                  <span style={styles.totalValueUsd}>
                    {fmt(order.total_usd)}
                  </span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>
                    {t("order_modal.total_khr", "Total KHR")}
                  </span>
                  <span style={styles.totalValueKhr}>
                    {fmtKHR(order.total_usd)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: PAYMENT & STATUS --- */}
          <div style={styles.column}>
            <div style={styles.sectionHeader}>
              <FiImage size={18} color="#0066FF" />
              <h3 style={styles.sectionTitle}>
                {t("order_modal.payment_details", "Payment Details")}
              </h3>
            </div>

            <div style={styles.card}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  {t("order_modal.method", "Method:")}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    textTransform: "capitalize",
                    color: "#111827",
                  }}
                >
                  {order.payment_method || t("order_modal.cash", "Cash")}
                </span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  {t("order_modal.status", "Status:")}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    backgroundColor:
                      order.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                    color: order.status === "completed" ? "#065F46" : "#D97706",
                  }}
                >
                  {order.status === "completed" ? (
                    <FiCheckCircle size={14} />
                  ) : (
                    <FiClock size={14} />
                  )}
                  {t(`order_modal.status_val.${order.status}`, order.status)}
                </span>
              </div>

              {order.phone_number && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>
                    {t("order_modal.phone", "Phone:")}
                  </span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    {order.phone_number}
                  </span>
                </div>
              )}
            </div>

            {order.payment_method === "bank" && order.receipt_url ? (
              <div style={styles.receiptBox}>
                <div style={styles.receiptHeader}>
                  {t("order_modal.receipt_upload", "Customer Receipt Upload")}
                </div>
                <a
                  href={order.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block" }}
                >
                  <img
                    src={order.receipt_url}
                    alt="Payment Receipt"
                    style={styles.receiptImage}
                  />
                </a>
                <div style={styles.receiptHint}>
                  {t(
                    "order_modal.click_to_view",
                    "Click image to view full size",
                  )}
                </div>
              </div>
            ) : order.payment_method === "bank" ? (
              <div style={styles.noReceiptBox}>
                {t("order_modal.no_receipt", "No receipt uploaded.")}
              </div>
            ) : null}

            {/* --- ACTION BUTTONS --- */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 24,
                display: "flex",
                gap: 12,
              }}
            >
              <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
                {t("order_modal.close", "Close")}
              </Button>
              <Button
                onClick={handlePrint}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <FiPrinter size={18} />
                {t("order_modal.print", "Print Receipt")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    alignItems: "start",
  },
  column: { display: "flex", flexDirection: "column", height: "100%" },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" },
  badge: {
    marginLeft: "auto",
    background: "#EFF6FF",
    color: "#1D4ED8",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  card: {
    background: "#FFF",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    marginBottom: 16,
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "300px",
    overflowY: "auto",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #F3F4F6",
  },
  imageBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    padding: 2,
  },
  itemDetails: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 2,
  },
  itemMeta: { fontSize: 12, color: "#6B7280", fontWeight: 500 },
  itemTotal: { fontSize: 14, fontWeight: 700, color: "#111827" },
  totalsBox: {
    padding: "16px",
    background: "#F9FAFB",
    borderTop: "1px solid #E5E7EB",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalLabel: { fontSize: 14, color: "#4B5563", fontWeight: 600 },
  totalValueUsd: { fontSize: 18, fontWeight: 800, color: "#0066FF" },
  totalValueKhr: { fontSize: 13, color: "#6B7280", fontWeight: 500 },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: 14,
  },
  infoLabel: { color: "#6B7280", fontWeight: 500 },
  receiptBox: {
    background: "#FFF",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  receiptHeader: {
    background: "#F9FAFB",
    padding: "12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    borderBottom: "1px solid #E5E7EB",
    textAlign: "center",
  },
  receiptImage: {
    width: "100%",
    maxHeight: "240px",
    objectFit: "contain",
    background: "#F9FAFB",
    display: "block",
  },
  receiptHint: {
    padding: 10,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    borderTop: "1px solid #E5E7EB",
    background: "#FFF",
  },
  noReceiptBox: {
    padding: 30,
    textAlign: "center",
    background: "#F9FAFB",
    border: "1px dashed #D1D5DB",
    color: "#9CA3AF",
    borderRadius: 16,
    fontSize: 14,
  },
};
