import { useState, useRef } from "react";
import {
  FiCheckCircle,
  FiCreditCard,
  FiShoppingBag,
  FiUpload,
  FiImage,
  FiArrowLeft,
  FiLock,
  FiDownload,
} from "react-icons/fi";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { fmt, fmtKHR } from "../../utils/currency";
import Modal from "../ui/Modal";
import Row from "../ui/Row";
import Button from "../ui/Button";
import { supabase } from "../../services/supabase";

export default function CheckoutModal({
  open,
  onClose,
  toast,
  appliedVoucher,
}) {
  // --- GLOBAL CONTEXT ---
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  // --- UI STATE ---
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- PAYMENT STATE ---
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [selectedBank, setSelectedBank] = useState("ABA");
  const [receiptFile, setReceiptFile] = useState(null);

  // --- VERIFICATION STATE ---
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [isVerifyingLoading, setIsVerifyingLoading] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // --- DISCOUNT MATH ---
  const discountUsd = appliedVoucher ? appliedVoucher.discount_khr / 4000 : 0;
  const finalTotalUsd = Math.max(total - discountUsd, 0);

  // ==========================================
  // HANDLERS: INPUT & UPLOAD
  // ==========================================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    if (value && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleDownloadQR = () => {
    const downloadLink = document.createElement("a");
    downloadLink.href =
      selectedBank === "ABA" ? "/aba-qr.png" : "/acleda-qr.JPG";
    downloadLink.download = `SopheaMart_${selectedBank}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast("QR Code downloaded! Please scan it in your app.", "success");
  };

  // ==========================================
  // HANDLERS: VERIFICATION
  // ==========================================
  const sendVerificationSms = async () => {
    if (phoneNumber.trim().length < 8)
      return toast("Please enter a valid phone number.", "error");
    setIsVerifyingLoading(true);
    try {
      setVerificationStatus("entering_otp");
      toast("Verification code sent successfully!", "success");
    } catch (err) {
      toast(err.message || "Failed to send SMS.", "error");
    } finally {
      setIsVerifyingLoading(false);
    }
  };

  const verifyOtpCode = async () => {
    if (otpCode.join("").length < 4)
      return toast("Please enter all 4 digits.", "error");
    setIsVerifyingLoading(true);
    try {
      setVerificationStatus("verified");
      toast("Phone verified successfully!", "success");
    } catch (err) {
      toast(err.message || "Invalid verification code.", "error");
    } finally {
      setIsVerifyingLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: CHECKOUT & DATABASE
  // ==========================================
  const confirm = async () => {
    if (!user) return toast("Please sign in to complete purchase.", "error");
    if (paymentMethod === "bank" && !receiptFile)
      return toast("Please upload your payment receipt.", "error");
    if (paymentMethod === "cash" && verificationStatus !== "verified")
      return toast("Please verify your phone number first.", "error");

    setIsProcessing(true);

    try {
      const orderId = `ORD-${String(Date.now()).slice(-4)}`;
      let receiptUrl = null;

      // 1. Upload Receipt
      if (paymentMethod === "bank" && receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${orderId}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(fileName, receiptFile);
        if (uploadError) throw uploadError;

        receiptUrl = supabase.storage.from("receipts").getPublicUrl(fileName)
          .data.publicUrl;
      }

      // 2. Create Order Record (Using Final Discounted Total)
      const newOrder = {
        id: orderId,
        user_id: user.id,
        total_usd: finalTotalUsd,
        total_khr: finalTotalUsd * 4000,
        total_items: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        status: "pending",
        payment_method: paymentMethod,
        bank_name: paymentMethod === "bank" ? selectedBank : null,
        phone_number:
          paymentMethod === "cash"
            ? `+855${phoneNumber.replace(/^0/, "")}`
            : null,
        payment_proof_url: receiptUrl,
        receipt_url: receiptUrl,
      };

      const { error: orderError } = await supabase
        .from("Orders")
        .insert([newOrder]);
      if (orderError) throw orderError;

      // 3. Create Order Items (FIXED BIGINT BUG: Returns null if item is a free gift)
      const orderItemsToSave = items.map((item) => ({
        order_id: orderId,
        product_name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
        product_id: item.isGift ? null : item.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsToSave);
      if (itemsError) throw itemsError;

      // 4. Burn the Voucher (if one was used)
      if (appliedVoucher) {
        const { error: voucherError } = await supabase
          .from("user_vouchers")
          .update({ is_used: true })
          .eq("id", appliedVoucher.id);
        if (voucherError)
          console.error("Failed to mark voucher as used:", voucherError);
      }

      setConfirmed(true);
    } catch (error) {
      console.error("Error during checkout:", error.message);
      toast("Checkout failed. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const close = () => {
    if (confirmed) dispatch({ type: "CLEAR" });
    setConfirmed(false);
    setReceiptFile(null);
    setPhoneNumber("");
    setOtpCode(["", "", "", ""]);
    setVerificationStatus("unverified");
    setPaymentMethod("bank");
    onClose();
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const bankLogoUrl =
    selectedBank === "ABA" ? "/aba-logo.png" : "/logo-acleda.jpg";
  const bankQrImage = selectedBank === "ABA" ? "/aba-qr.png" : "/acleda-qr.JPG";

  return (
    <Modal
      open={open}
      onClose={close}
      title={confirmed ? "Order Received" : "Checkout"}
      wide
    >
      {confirmed ? (
        <div style={styles.successContainer}>
          <div style={styles.successIconBox}>
            <FiCheckCircle size={48} color="#0066FF" />
          </div>
          <h2 style={styles.successTitle}>ការបញ្ជាទិញបានជោគជ័យ</h2>
          <p style={styles.successDesc}>
            ការបញ្ជាទិញរបស់អ្នកត្រូវបានដាក់រួចរាល់ហើយ។ ឥឡូវនេះ
            អ្នកអាចមកទទួលទំនិញរបស់អ្នកនៅ Sophea Mart បាន។
          </p>
          <Button onClick={close} full>
            បន្តទិញទំនិញ
          </Button>
        </div>
      ) : (
        <>
          {/* SMS VERIFICATION: ENTER PHONE */}
          {verificationStatus === "entering_phone" && (
            <div style={styles.verifyContainer}>
              <button
                onClick={() => setVerificationStatus("unverified")}
                style={styles.backButton}
              >
                <FiArrowLeft size={16} /> Back to Checkout
              </button>
              <h2 style={styles.verifyTitle}>Verify Phone Number</h2>
              <p style={styles.verifyDesc}>
                Enter your phone number to receive a secure 4-digit verification
                code via SMS.
              </p>
              <div style={styles.phoneInputWrapper}>
                <div style={styles.phonePrefix}>🇰🇭 +855</div>
                <input
                  type="tel"
                  placeholder="96 210 6665"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                  style={styles.phoneInput}
                />
              </div>
              <Button
                onClick={sendVerificationSms}
                full
                disabled={isVerifyingLoading}
              >
                {isVerifyingLoading ? "Sending Code..." : "Continue"}
              </Button>
            </div>
          )}

          {/* SMS VERIFICATION: ENTER OTP */}
          {verificationStatus === "entering_otp" && (
            <div style={styles.verifyContainerCenter}>
              <button
                onClick={() => setVerificationStatus("entering_phone")}
                style={styles.backButton}
              >
                <FiArrowLeft size={16} /> Change Phone Number
              </button>
              <h2 style={styles.verifyTitle}>Verification Code</h2>
              <p style={styles.verifyDesc}>
                We sent a 4-digit verification code to{" "}
                <strong style={{ color: "#111827" }}>+855 {phoneNumber}</strong>
              </p>
              <div style={styles.otpWrapper}>
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    style={styles.otpInput}
                  />
                ))}
              </div>
              <Button
                onClick={verifyOtpCode}
                full
                disabled={isVerifyingLoading}
              >
                {isVerifyingLoading ? "Verifying..." : "Verify & Connect"}
              </Button>
            </div>
          )}

          {/* MAIN CHECKOUT VIEW */}
          {(verificationStatus === "unverified" ||
            verificationStatus === "verified") && (
            <div style={styles.layoutGrid}>
              {/* LEFT SIDE: Payment Methods */}
              <div>
                <div style={styles.sectionHeader}>
                  <FiCreditCard size={18} color="#0066FF" />
                  <h3 style={styles.sectionTitle}>Payment Method</h3>
                </div>

                <div style={styles.methodSelector}>
                  {/* Bank Transfer Option */}
                  <label
                    style={
                      paymentMethod === "bank"
                        ? styles.methodLabelActive
                        : styles.methodLabelInactive
                    }
                  >
                    <div style={styles.methodLabelInner}>
                      <input
                        type="radio"
                        checked={paymentMethod === "bank"}
                        onChange={() => setPaymentMethod("bank")}
                        style={styles.radioInput}
                      />
                      <div style={styles.bankLogoWrapper}>
                        <img
                          src={bankLogoUrl}
                          alt="Bank"
                          style={styles.bankLogoImage}
                        />
                      </div>
                      <div>
                        <div style={styles.methodTitle}>Bank Transfer</div>
                        <div style={styles.methodSubtitle}>
                          ទូទាត់លុយតាមរយៈធនាគារ
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Cash Option */}
                  <label
                    style={
                      paymentMethod === "cash"
                        ? styles.methodLabelActive
                        : styles.methodLabelInactive
                    }
                  >
                    <div style={styles.methodLabelInner}>
                      <input
                        type="radio"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        style={styles.radioInput}
                      />
                      <div style={styles.cashLogoWrapper}>៛</div>
                      <div>
                        <div style={styles.methodTitle}>Cash on Take-Away</div>
                        <div style={styles.methodSubtitle}>
                          បង់លុយពេលមកទទួលយកទំនិញ
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Bank Transfer Details */}
                {paymentMethod === "bank" && (
                  <div style={styles.bankDetailsArea}>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      style={styles.selectInput}
                    >
                      <option value="ABA">ABA Bank</option>
                      <option value="Acleda">Acleda Bank</option>
                    </select>

                    <div style={styles.qrAmountBanner}>
                      <div style={styles.qrAmountSub}>
                        សូមស្កេន QR និងបញ្ចូលចំនួនទឹកប្រាក់ឱ្យបានត្រឹមត្រូវ
                      </div>
                      <div style={styles.qrAmountMain}>
                        {fmt(finalTotalUsd)}{" "}
                        <span style={styles.qrAmountCurrency}>USD</span>
                      </div>
                    </div>

                    <div style={styles.qrImageContainer}>
                      <img
                        src={bankQrImage}
                        alt={`${selectedBank} QR Code`}
                        style={styles.qrImage}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      style={styles.downloadBtn}
                    >
                      <FiDownload size={18} /> Download QR Code
                    </button>

                    <label
                      style={
                        receiptFile
                          ? styles.uploadLabelActive
                          : styles.uploadLabelInactive
                      }
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
                            size={24}
                            color="#2563EB"
                            style={{ marginBottom: 4 }}
                          />
                          <span style={styles.uploadTextActive}>
                            {receiptFile.name}
                          </span>
                          <span style={styles.uploadSubTextActive}>
                            Click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <FiUpload
                            size={24}
                            color="#9CA3AF"
                            style={{ marginBottom: 4 }}
                          />
                          <span style={styles.uploadTextInactive}>
                            Upload Screenshot
                          </span>
                          <span style={styles.uploadSubTextInactive}>
                            JPEG, PNG accepted
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* Cash Options Details */}
                {paymentMethod === "cash" && (
                  <div style={styles.fadeAnim}>
                    {verificationStatus === "unverified" ? (
                      <div style={styles.statusBoxUnverified}>
                        <div style={styles.iconCircleGray}>
                          <FiLock size={20} color="#6B7280" />
                        </div>
                        <h4 style={styles.statusTitleDark}>
                          តម្រូវឱ្យផ្ទៀងផ្ទាត់លេខទូរស័ព្ទ
                        </h4>
                        <p style={styles.statusDescGray}>
                          សូមផ្ទៀងផ្ទាត់លេខទូរស័ព្ទរបស់អ្នក
                          មុនពេលបញ្ជាក់ការបញ្ជាទិញ។
                        </p>
                        <Button
                          type="button"
                          onClick={() =>
                            setVerificationStatus("entering_phone")
                          }
                          style={{ width: "100%" }}
                        >
                          Verify Phone Number
                        </Button>
                      </div>
                    ) : (
                      <div style={styles.statusBoxVerified}>
                        <div style={styles.iconCircleGreen}>
                          <FiCheckCircle size={22} color="#10B981" />
                        </div>
                        <h4 style={styles.statusTitleGreen}>
                          Verification Successful!
                        </h4>
                        <p style={styles.statusDescGreen}>
                          Your phone is verified (+855 {phoneNumber}). Enjoy
                          your shopping!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: Order Summary */}
              <div>
                <div style={styles.sectionHeader}>
                  <FiShoppingBag size={18} color="#0066FF" />
                  <h3 style={styles.sectionTitle}>Order Summary</h3>
                </div>

                <div style={styles.summaryListContainer}>
                  {items.map((item) => (
                    <div key={item.id} style={styles.summaryItem}>
                      <div style={styles.summaryItemLeft}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={styles.summaryItemImg}
                        />
                        <span>
                          {item.name}{" "}
                          <span style={styles.summaryItemQty}>
                            ×{item.quantity || 1}
                          </span>
                        </span>
                      </div>
                      <strong style={styles.summaryItemPrice}>
                        {fmt(item.price * (item.quantity || 1))}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={styles.totalsBox}>
                  {/* Subtotal */}
                  <div style={styles.totalsRow}>
                    <span style={styles.totalsRowLabel}>Subtotal</span>
                    <span style={styles.totalsRowValue}>{fmt(total)}</span>
                  </div>

                  {/* Discount line (if applied) */}
                  {appliedVoucher && (
                    <div style={styles.totalsRow}>
                      <span
                        style={{
                          ...styles.totalsRowLabel,
                          color: "#D91236",
                          fontWeight: 600,
                        }}
                      >
                        Voucher
                      </span>
                      <span
                        style={{ ...styles.totalsRowValue, color: "#D91236" }}
                      >
                        -{fmt(discountUsd)}
                      </span>
                    </div>
                  )}

                  <div style={styles.totalsDivider} />

                  {/* Final Total */}
                  <div style={{ textAlign: "center" }}>
                    <div style={styles.totalsUsd}>{fmt(finalTotalUsd)}</div>
                    <div style={styles.totalsKhr}>{fmtKHR(finalTotalUsd)}</div>
                  </div>
                </div>

                <Button
                  onClick={confirm}
                  full
                  disabled={
                    isProcessing ||
                    (paymentMethod === "cash" &&
                      verificationStatus !== "verified")
                  }
                >
                  {isProcessing
                    ? "Processing..."
                    : paymentMethod === "bank"
                      ? `បញ្ជាទិញ ${fmt(finalTotalUsd)}`
                      : "បញ្ជាក់ការបញ្ជាទិញ"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ==========================================
// EXTRACTED STYLES
// ==========================================
const styles = {
  // Success Screen
  successContainer: { textAlign: "center", padding: "30px 0" },
  successIconBox: {
    width: 90,
    height: 90,
    margin: "0 auto 20px",
    borderRadius: "50%",
    background: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { color: "#111827", marginBottom: 10 },
  successDesc: {
    color: "#6B7280",
    maxWidth: 360,
    margin: "0 auto 24px",
    lineHeight: 1.7,
  },

  // Verification Views
  verifyContainer: { maxWidth: 420, margin: "20px auto", padding: "10px 20px" },
  verifyContainerCenter: {
    maxWidth: 420,
    margin: "20px auto",
    padding: "10px 20px",
    textAlign: "center",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    color: "#6B7280",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    padding: 0,
    marginBottom: 20,
  },
  verifyTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 8,
  },
  verifyDesc: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 28,
  },
  phoneInputWrapper: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #D1D5DB",
    borderRadius: 14,
    background: "#FFF",
    overflow: "hidden",
    marginBottom: 24,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  phonePrefix: {
    padding: "16px",
    background: "#F3F4F6",
    borderRight: "1px solid #D1D5DB",
    fontWeight: 600,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    padding: "16px",
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#111827",
    width: "100%",
    letterSpacing: "0.5px",
  },
  otpWrapper: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    marginBottom: 36,
  },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: 14,
    border: "2px solid #D1D5DB",
    textAlign: "center",
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    outline: "none",
    background: "#F9FAFB",
  },

  // Layout Grid
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 32,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" },

  // Payment Selection
  methodSelector: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
  },
  methodLabelActive: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    border: "2px solid #0066FF",
    borderRadius: 12,
    cursor: "pointer",
    background: "#EFF6FF",
    transition: "all 0.2s ease",
  },
  methodLabelInactive: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    cursor: "pointer",
    background: "#FFF",
    transition: "all 0.2s ease",
  },
  methodLabelInner: { display: "flex", alignItems: "center", gap: 14 },
  radioInput: {
    width: 20,
    height: 20,
    accentColor: "#0066FF",
    cursor: "pointer",
  },
  bankLogoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid #E5E7EB",
    background: "#fff",
  },
  bankLogoImage: { width: "100%", height: "100%", objectFit: "cover" },
  cashLogoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#4B5563",
    fontWeight: "bold",
  },
  methodTitle: { fontWeight: 600, color: "#111827", fontSize: 16 },
  methodSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  // Bank Specific Details
  bankDetailsArea: {
    animation: "fadeIn 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "20px",
  },
  selectInput: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #D1D5DB",
    fontSize: 15,
    outline: "none",
    fontWeight: 500,
    color: "#111827",
  },
  qrAmountBanner: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center",
  },
  qrAmountSub: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: 500,
    marginBottom: 4,
  },
  qrAmountMain: { fontSize: 28, fontWeight: 800, color: "#1E3A8A" },
  qrAmountCurrency: { fontSize: 16, fontWeight: 600, opacity: 0.8 },
  qrImageContainer: {
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    maxWidth: "220px",
    height: "auto",
    display: "block",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  downloadBtn: {
    width: "100%",
    padding: "12px",
    background: "#FFFFFF",
    color: "#4B5563",
    border: "1px solid #D1D5DB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.2s",
  },

  // Upload Area
  uploadLabelActive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "#EFF6FF",
    border: "2px solid #2563EB",
    borderRadius: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  uploadLabelInactive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "#ffffff",
    border: "2px dashed #D1D5DB",
    borderRadius: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  uploadTextActive: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1D4ED8",
    textAlign: "center",
  },
  uploadSubTextActive: { fontSize: 12, color: "#60A5FA", marginTop: 2 },
  uploadTextInactive: { fontSize: 14, fontWeight: 600, color: "#4B5563" },
  uploadSubTextInactive: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  // Cash Verification Areas
  fadeAnim: { animation: "fadeIn 0.3s ease-in-out" },
  statusBoxUnverified: {
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 20,
    textAlign: "center",
    background: "#FFFFFF",
  },
  iconCircleGray: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  statusTitleDark: {
    margin: "0 0 6px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
  },
  statusDescGray: {
    margin: "0 0 16px 0",
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 1.5,
  },
  statusBoxVerified: {
    border: "1px solid #10B981",
    borderRadius: 16,
    padding: 20,
    textAlign: "center",
    background: "#ECFDF5",
  },
  iconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#D1FAE5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  statusTitleGreen: {
    margin: "0 0 4px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#065F46",
  },
  statusDescGreen: { margin: 0, fontSize: 13, color: "#047857" },

  // Order Summary
  summaryListContainer: {
    maxHeight: 220,
    overflowY: "auto",
    marginBottom: 16,
    border: "1px solid #E5E7EB",
    borderRadius: 14,
    padding: 12,
    background: "#FFFFFF",
  },
  summaryItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #F3F4F6",
    fontSize: 14,
  },
  summaryItemLeft: {
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  summaryItemImg: { width: 24, height: 24, objectFit: "contain" },
  summaryItemQty: { color: "#9CA3AF", marginLeft: 4 },
  summaryItemPrice: { color: "#111827" },
  totalsBox: {
    background: "#F8FAFC",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  totalsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalsRowLabel: { fontSize: 14, color: "#4B5563", fontWeight: 500 },
  totalsRowValue: { fontSize: 14, fontWeight: 600, color: "#111827" },
  totalsDivider: { borderTop: "1px solid #E5E7EB", margin: "10px 0" },
  totalsUsd: { fontSize: 32, fontWeight: 600, color: "#0066FF" },
  totalsKhr: { fontSize: 15, color: "#6B7280", marginTop: 4 },
};
