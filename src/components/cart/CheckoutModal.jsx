import { useState } from "react";
import {
  FiCheckCircle,
  FiCreditCard,
  FiShoppingBag,
  FiUpload,
  FiImage,
} from "react-icons/fi";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useStore } from "../../hooks/useStore";
import { fmt, fmtKHR } from "../../utils/currency";
import Modal from "../ui/Modal";
import Row from "../ui/Row";
import Button from "../ui/Button";

// IMPORTANT: We must import supabase so we can save the order to the database!
import { supabase } from "../../services/supabase";

export default function CheckoutModal({ open, onClose, toast }) {
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  const [confirmed, setConfirmed] = useState(false);

  // NEW STATE: For the receipt image and loading status
  const [receiptFile, setReceiptFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const confirm = async () => {
    if (!user) {
      toast("Please sign in to complete purchase.", "error");
      onClose();
      return;
    }

    // REQUIRE the receipt to be uploaded before continuing
    if (!receiptFile) {
      toast("Please upload your payment receipt.", "error");
      return;
    }

    setIsProcessing(true); // Start loading spinner

    try {
      const orderId = `ORD-${String(Date.now()).slice(-4)}`;
      let receiptUrl = null;

      // 1. Upload the image to the 'receipts' bucket
      const fileExt = receiptFile.name.split(".").pop();
      const fileName = `${orderId}-${Math.random()}.${fileExt}`; // Give it a unique name

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // 2. Get the public URL of the image we just uploaded
      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      receiptUrl = publicUrlData.publicUrl;

      // 3. Format the order WITH the new receipt_url
      const newOrder = {
        id: orderId,
        user_id: user.id,
        total_usd: total,
        total_khr: total * 4000,
        total_items: items.reduce((sum, item) => sum + item.qty, 0),
        status: "pending",
        receipt_url: receiptUrl, // <--- SAVING THE IMAGE URL HERE
      };

      // 4. Save to Orders table
      const { error: orderError } = await supabase
        .from("Orders")
        .insert([newOrder]);
      if (orderError) throw orderError;

      // 5. Save Order Items
      const orderItemsToSave = items.map((item) => ({
        order_id: orderId,
        product_name: item.name,
        quantity: item.qty,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsToSave);
      if (itemsError) throw itemsError;

      // 6. Success!
      setConfirmed(true);
    } catch (error) {
      console.error("Error during checkout:", error.message);
      toast("Checkout failed. Please try again.", "error");
    } finally {
      setIsProcessing(false); // Stop loading spinner
    }
  };

  const close = () => {
    if (confirmed) {
      dispatch({ type: "CLEAR" });
    }
    setConfirmed(false);
    setReceiptFile(null); // Clear the file when closed
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={confirmed ? "Payment Submitted" : "Checkout"}
      wide
    >
      {confirmed ? (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div
            style={{
              width: 90,
              height: 90,
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiCheckCircle size={48} color="#0066FF" />
          </div>

          <h2 style={{ color: "#111827", marginBottom: 10 }}>
            Order Placed Successfully
          </h2>

          <p
            style={{
              color: "#6B7280",
              maxWidth: 360,
              margin: "0 auto 24px",
              lineHeight: 1.7,
            }}
          >
            Your payment receipt has been uploaded and your order is now pending
            review.
          </p>

          <Button onClick={close} full>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {/* Payment Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <FiCreditCard size={18} color="#0066FF" />
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                KHQR Payment
              </h3>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E5E7EB",
                borderRadius: 20,
                padding: 24,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              <img
                src="/IMG_5533.jpg"
                alt="KHQR Code"
                style={{
                  width: "100%",
                  maxWidth: 220,
                  display: "block",
                  margin: "0 auto 16px",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                }}
              />
              <div
                style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}
              >
                ABA Bank
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                Small Mart Store
              </div>
            </div>

            <div
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#374151",
                  lineHeight: 1.7,
                }}
              >
                1. បើកកម្មវិធីធនាគាររបស់អ្នក (Open Bank App)
                <br />
                2. ស្កេនកូដបង់ប្រាក់ (Scan to Pay)
                <br />
                3. ថតអេក្រង់វិក័យប័ត្រ (Screenshot Receipt)
                <br />
                4. អាប់ឡូតរូបភាពខាងក្រោម (Upload Below)
              </p>
            </div>

            {/* NEW: Upload Receipt Box */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  background: receiptFile ? "#EFF6FF" : "#ffffff",
                  border: receiptFile
                    ? "2px solid #2563EB"
                    : "2px dashed #D1D5DB",
                  borderRadius: 14,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                {receiptFile ? (
                  <>
                    <FiImage
                      size={28}
                      color="#2563EB"
                      style={{ marginBottom: 8 }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#1D4ED8",
                        textAlign: "center",
                      }}
                    >
                      {receiptFile.name}
                    </span>
                    <span
                      style={{ fontSize: 12, color: "#60A5FA", marginTop: 4 }}
                    >
                      Click to change image
                    </span>
                  </>
                ) : (
                  <>
                    <FiUpload
                      size={28}
                      color="#9CA3AF"
                      style={{ marginBottom: 8 }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#4B5563",
                      }}
                    >
                      Upload Screenshot
                    </span>
                    <span
                      style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}
                    >
                      JPEG, PNG accepted
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Order Summary Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <FiShoppingBag size={18} color="#0066FF" />
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Order Summary
              </h3>
            </div>

            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                marginBottom: 16,
                border: "1px solid #E5E7EB",
                borderRadius: 14,
                padding: 12,
                background: "#FFFFFF",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                    fontSize: 14,
                  }}
                >
                  <div
                    style={{
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 24, height: 24, objectFit: "contain" }}
                    />
                    <span>
                      {item.name}
                      <span style={{ color: "#9CA3AF", marginLeft: 4 }}>
                        ×{item.qty}
                      </span>
                    </span>
                  </div>
                  <strong style={{ color: "#111827" }}>
                    {fmt(item.price * item.qty)}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Row
                label="Items"
                value={items.reduce((sum, item) => sum + item.qty, 0)}
              />
              <div
                style={{ borderTop: "1px solid #E5E7EB", margin: "10px 0" }}
              />

              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 32, fontWeight: 600, color: "#0066FF" }}
                >
                  {fmt(total)}
                </div>
                <div style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }}>
                  {fmtKHR(total)}
                </div>
              </div>
            </div>

            <Button onClick={confirm} full disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
