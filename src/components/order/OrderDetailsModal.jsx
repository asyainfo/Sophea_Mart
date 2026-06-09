import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import Modal from "../ui/Modal";
import { fmt } from "../../utils/currency";
import { FiImage } from "react-icons/fi";

export default function OrderDetailsModal({ open, onClose, orderId }) {
  const [items, setItems] = useState([]);
  const [orderRecord, setOrderRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);

    try {
      // 1. Fetch the items for this order
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 2. Fetch the main order record to get the receipt_url
      const { data: orderData, error: orderError } = await supabase
        .from("Orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrderRecord(orderData);
    } catch (error) {
      console.error("Supabase Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Order #${orderId}`}>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
          Loading order details...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Items List */}
          <div>
            <h4
              style={{ margin: "0 0 12px 0", color: "#111827", fontSize: 16 }}
            >
              Items Purchased
            </h4>
            <div style={{ display: "grid", gap: 12 }}>
              {items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: 8,
                      color: "#374151",
                    }}
                  >
                    <span>
                      {item.product_name}{" "}
                      <span style={{ color: "#9CA3AF" }}>
                        (x{item.quantity})
                      </span>
                    </span>
                    <strong style={{ color: "#111827" }}>
                      {fmt(item.price * item.quantity)}
                    </strong>
                  </div>
                ))
              ) : (
                <p style={{ color: "#6B7280", margin: 0 }}>No items found.</p>
              )}
            </div>
          </div>

          {/* Payment Receipt Section */}
          {orderRecord?.receipt_url && (
            <div
              style={{
                borderTop: "1px solid #E5E7EB",
                paddingTop: 20,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <FiImage color="#0066FF" />
                <h4 style={{ margin: 0, color: "#111827", fontSize: 16 }}>
                  Payment Receipt
                </h4>
              </div>

              <div
                style={{
                  background: "#F9FAFB",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  textAlign: "center",
                }}
              >
                <a
                  href={orderRecord.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={orderRecord.receipt_url}
                    alt="Customer Uploaded Receipt"
                    style={{
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "contain",
                      borderRadius: 8,
                      cursor: "zoom-in",
                    }}
                  />
                </a>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                    margin: "8px 0 0 0",
                  }}
                >
                  Click image to view full size
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
