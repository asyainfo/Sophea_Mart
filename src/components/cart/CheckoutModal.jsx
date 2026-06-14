import { useState, useRef } from "react";
import {
  FiCheckCircle,
  FiCreditCard,
  FiShoppingBag,
  FiUpload,
  FiImage,
  FiArrowLeft,
  FiLock,
} from "react-icons/fi";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { fmt, fmtKHR } from "../../utils/currency";
import Modal from "../ui/Modal";
import Row from "../ui/Row";
import Button from "../ui/Button";
import { supabase } from "../../services/supabase";

export default function CheckoutModal({ open, onClose, toast }) {
  const { items, total, dispatch } = useCart();
  const { user } = useAuth();

  // --- UI & Verification State ---
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Payment Method State ---
  const [paymentMethod, setPaymentMethod] = useState("bank"); // 'bank' or 'cash'
  const [selectedBank, setSelectedBank] = useState("ABA"); // 'ABA' or 'Acleda'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);

  // --- OTP Verification Sub-States ---
  // Statuses: 'unverified' | 'entering_phone' | 'entering_otp' | 'verified'
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [isVerifyingLoading, setIsVerifyingLoading] = useState(false);

  // Refs for handling automatic focus switching between the 4 OTP boxes
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  // Handle key entry for individual OTP digit boxes
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1); // Keep last character typed
    setOtpCode(newOtp);

    // Auto-focus next box if value is filled
    if (value && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move to previous box on Backspace if empty
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  // --- Step A: Trigger real SMS via Supabase (MOCK for now until keys are ready) ---
  const sendVerificationSms = async () => {
    if (phoneNumber.trim().length < 8) {
      toast("Please enter a valid phone number.", "error");
      return;
    }

    setIsVerifyingLoading(true);
    try {
      // Formatted international mobile string e.g., +855962106665
      const formattedPhone = `+855${phoneNumber.replace(/^0/, "")}`;

      console.log("Sending SMS to:", formattedPhone);

      /* Uncomment this block below once your Twilio provider is active in Supabase!
         
         const { error } = await supabase.auth.signInWithOtp({
           phone: formattedPhone,
         });
         if (error) throw error;
      */

      // Move view panel to the 4-digit entry screen
      setVerificationStatus("entering_otp");
      toast("Verification code sent successfully!", "success");
    } catch (err) {
      toast(err.message || "Failed to send SMS.", "error");
    } finally {
      setIsVerifyingLoading(false);
    }
  };

  // --- Step B: Verify the typed 4-digit code ---
  const verifyOtpCode = async () => {
    const combinedCode = otpCode.join("");
    if (combinedCode.length < 4) {
      toast("Please enter all 4 digits.", "error");
      return;
    }

    setIsVerifyingLoading(true);
    try {
      const formattedPhone = `+855${phoneNumber.replace(/^0/, "")}`;

      console.log("Verifying code:", combinedCode, "for", formattedPhone);

      /* Uncomment this block below once your Twilio provider is active in Supabase!
         
         const { data, error } = await supabase.auth.verifyOtp({
           phone: formattedPhone,
           token: combinedCode,
           type: 'sms'
         });
         if (error) throw error;
      */

      // Success! Clear inputs and change state status back to checkout
      setVerificationStatus("verified");
      toast("Phone verified successfully!", "success");
    } catch (err) {
      toast(err.message || "Invalid verification code.", "error");
    } finally {
      setIsVerifyingLoading(false);
    }
  };

  const confirm = async () => {
    if (!user) {
      toast("Please sign in to complete purchase.", "error");
      onClose();
      return;
    }

    if (paymentMethod === "bank" && !receiptFile) {
      toast("Please upload your payment receipt.", "error");
      return;
    }

    // Safety fallback block for Cash Orders
    if (paymentMethod === "cash" && verificationStatus !== "verified") {
      toast("Please verify your phone number first.", "error");
      return;
    }

    setIsProcessing(true);

    try {
      const orderId = `ORD-${String(Date.now()).slice(-4)}`;
      let receiptUrl = null;

      if (paymentMethod === "bank" && receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${orderId}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("receipts")
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData.publicUrl;
      }

      const newOrder = {
        id: orderId,
        user_id: user.id,
        total_usd: total,
        total_khr: total * 4000,
        total_items: items.reduce((sum, item) => sum + item.qty, 0),
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

      const orderItemsToSave = items.map((item) => ({
        order_id: orderId,
        product_name: item.name,
        quantity: item.qty,
        price: item.price,
        product_id: item.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsToSave);
      if (itemsError) throw itemsError;

      setConfirmed(true);
    } catch (error) {
      console.error("Error during checkout:", error.message);
      toast("Checkout failed. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const close = () => {
    if (confirmed) {
      dispatch({ type: "CLEAR" });
    }
    setConfirmed(false);
    setReceiptFile(null);
    setPhoneNumber("");
    setOtpCode(["", "", "", ""]);
    setVerificationStatus("unverified");
    setPaymentMethod("bank");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={confirmed ? "Order Received" : "Checkout"}
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
            Your order has been placed. You can now come to take your items at
            Sophea Mart.
          </p>
          <Button onClick={close} full>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <>
          {/* PANELS 2 & 3: FULL WIDTH PHONE INPUT OR VERIFICATION CODE SCREEN */}
          {verificationStatus === "entering_phone" && (
            <div
              style={{
                maxWidth: 420,
                margin: "20px auto",
                padding: "10px 20px",
              }}
            >
              <button
                onClick={() => setVerificationStatus("unverified")}
                style={{
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
                }}
              >
                <FiArrowLeft size={16} /> Back to Checkout
              </button>

              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Verify Phone Number
              </h2>
              <p
                style={{
                  color: "#6B7280",
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 28,
                }}
              >
                Enter your phone number to receive a secure 4-digit verification
                code via SMS.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #D1D5DB",
                  borderRadius: 14,
                  background: "#FFF",
                  overflow: "hidden",
                  marginBottom: 24,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    background: "#F3F4F6",
                    borderRight: "1px solid #D1D5DB",
                    fontWeight: 600,
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 16,
                  }}
                >
                  🇰🇭 +855
                </div>
                <input
                  type="tel"
                  placeholder="96 210 6665"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "16px",
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    color: "#111827",
                    width: "100%",
                    letterSpacing: "0.5px",
                  }}
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

          {verificationStatus === "entering_otp" && (
            <div
              style={{
                maxWidth: 420,
                margin: "20px auto",
                padding: "10px 20px",
                textAlign: "center",
              }}
            >
              <button
                onClick={() => setVerificationStatus("entering_phone")}
                style={{
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
                  marginBottom: 24,
                  textAlign: "left",
                }}
              >
                <FiArrowLeft size={16} /> Change Phone Number
              </button>

              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Verification Code
              </h2>
              <p
                style={{
                  color: "#6B7280",
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 32,
                }}
              >
                We sent a 4-digit verification code to{" "}
                <strong style={{ color: "#111827" }}>+855 {phoneNumber}</strong>
              </p>

              {/* 4 Square Code input block boxes */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 14,
                  marginBottom: 36,
                }}
              >
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 14,
                      border: "2px solid #D1D5DB",
                      textAlign: "center",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#111827",
                      outline: "none",
                      focusColor: "#0066FF",
                      transition: "all 0.15s ease",
                      background: "#F9FAFB",
                    }}
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

              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 20 }}>
                Didn't receive the code?{" "}
                <span
                  onClick={sendVerificationSms}
                  style={{
                    color: "#0066FF",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Resend SMS
                </span>
              </p>
            </div>
          )}

          {/* VIEW PHASES 1 & 4: NORMAL CHECKOUT WINDOW LAYOUT */}
          {(verificationStatus === "unverified" ||
            verificationStatus === "verified") && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 32,
              }}
            >
              {/* LEFT SIDE: Payment Options Selection */}
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
                    Payment Method
                  </h3>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  {/* Bank Option Row */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      border:
                        paymentMethod === "bank"
                          ? "2px solid #0066FF"
                          : "1px solid #E5E7EB",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: paymentMethod === "bank" ? "#EFF6FF" : "#FFF",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <input
                        type="radio"
                        checked={paymentMethod === "bank"}
                        onChange={() => setPaymentMethod("bank")}
                        style={{
                          width: 20,
                          height: 20,
                          accentColor: "#0066FF",
                          cursor: "pointer",
                        }}
                      />
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #E5E7EB",
                          background: "#fff",
                        }}
                      >
                        <img
                          src={
                            selectedBank === "ABA"
                              ? "/aba-logo.png"
                              : "/acleda-logo.png"
                          }
                          alt={`${selectedBank} Pay`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: 16,
                          }}
                        >
                          Bank Transfer
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          ទូទាត់លុយតាមរយៈធនាគារ
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Cash Option Row */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      border:
                        paymentMethod === "cash"
                          ? "2px solid #0066FF"
                          : "1px solid #E5E7EB",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: paymentMethod === "cash" ? "#EFF6FF" : "#FFF",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <input
                        type="radio"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        style={{
                          width: 20,
                          height: 20,
                          accentColor: "#0066FF",
                          cursor: "pointer",
                        }}
                      />
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          border: "1px solid #E5E7EB",
                          background: "#F3F4F6",
                          display: "flex",
                          alignItems: "center",
                          justifyBox: "center",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          color: "#4B5563",
                          fontWeight: "bold",
                        }}
                      >
                        ៛
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: 16,
                          }}
                        >
                          Cash on Take-Away
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          បង់លុយពេលមកទទួលយកទំនិញ
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* SUB-PANEL: BANK TRANSFER INFO AREA */}
                {paymentMethod === "bank" && (
                  <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: "1px solid #D1D5DB",
                        fontSize: 15,
                        outline: "none",
                        marginBottom: 16,
                        fontWeight: 500,
                        color: "#111827",
                      }}
                    >
                      <option value="ABA">ABA Bank</option>
                      <option value="Acleda">Acleda Bank</option>
                    </select>

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
                        src={
                          selectedBank === "ABA"
                            ? "/IMG_5533.jpg"
                            : "/acleda-qr.jpg"
                        }
                        alt={`${selectedBank} QR Code`}
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
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                          marginBottom: 4,
                        }}
                      >
                        {selectedBank} Bank
                      </div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>
                        Sophea Mart
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
                            style={{
                              fontSize: 12,
                              color: "#60A5FA",
                              marginTop: 4,
                            }}
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
                            style={{
                              fontSize: 12,
                              color: "#9CA3AF",
                              marginTop: 4,
                            }}
                          >
                            JPEG, PNG accepted
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* SUB-PANEL: CASH VERIFICATION STATUS SWITCH AREA */}
                {paymentMethod === "cash" && (
                  <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                    {verificationStatus === "unverified" ? (
                      /* PHASE 1: UNVERIFIED VIEW (Shows Blue Verification Button Trigger) */
                      <div
                        style={{
                          border: "1px solid #E5E7EB",
                          borderRadius: 16,
                          padding: 20,
                          textAlign: "center",
                          background: "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                          }}
                        >
                          <FiLock size={20} color="#6B7280" />
                        </div>
                        <h4
                          style={{
                            margin: "0 0 6px 0",
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          Phone Verification Required
                        </h4>
                        <p
                          style={{
                            margin: "0 0 16px 0",
                            fontSize: 13,
                            color: "#6B7280",
                            lineHeight: 1.5,
                          }}
                        >
                          To prevent prank orders, please quickly verify your
                          mobile phone number before confirming.
                        </p>
                        <Button
                          type="button"
                          onClick={() =>
                            setVerificationStatus("entering_phone")
                          }
                          style={{
                            background: "#0066FF",
                            color: "#FFF",
                            width: "100%",
                          }}
                        >
                          Verify Phone Number
                        </Button>
                      </div>
                    ) : (
                      /* PHASE 4: SUCCESS VERIFIED VIEW */
                      <div
                        style={{
                          border: "1px solid #10B981",
                          borderRadius: 16,
                          padding: 20,
                          textAlign: "center",
                          background: "#ECFDF5",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "#D1FAE5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                          }}
                        >
                          <FiCheckCircle size={22} color="#10B981" />
                        </div>
                        <h4
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#065F46",
                          }}
                        >
                          Verification Successful!
                        </h4>
                        <p
                          style={{ margin: 0, fontSize: 13, color: "#047857" }}
                        >
                          Your phone is verified (+855 {phoneNumber}). Enjoy
                          your shopping!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: Static Order Summary Panel */}
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
                          style={{
                            width: 24,
                            height: 24,
                            objectFit: "contain",
                          }}
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
                      style={{
                        fontSize: 32,
                        fontWeight: 600,
                        color: "#0066FF",
                      }}
                    >
                      {fmt(total)}
                    </div>
                    <div
                      style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }}
                    >
                      {fmtKHR(total)}
                    </div>
                  </div>
                </div>

                {/* The main checkout button stays locked if cash is chosen but number is unverified */}
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
                      ? `Place Order ${fmt(total)}`
                      : "Confirm Order"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
