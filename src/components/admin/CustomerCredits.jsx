import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FiPlus,
  FiX,
  FiUploadCloud,
  FiImage,
  FiInbox,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
} from "react-icons/fi";
import { supabase } from "../../services/supabase";
import { fmt, fmtKHR } from "../../utils/currency";
import Button from "../ui/Button";

// --- REUSABLE STYLES ---
const COLORS = {
  primary: "#0066FF",
  border: "#E5E7EB",
  muted: "#6B7280",
  text: "#111827",
  surface: "#F9FAFB",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
};

const tableCell = {
  padding: "16px 20px",
  fontSize: 14,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

// --- GLOBAL TOAST DISPATCHER ---
const triggerGlobalToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

export default function CustomerCredits() {
  const { t } = useTranslation();
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // --- Search & Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal, Image & Edit State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // Partial Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [partialAmount, setPartialAmount] = useState("");

  // Lightbox State
  const [viewImage, setViewImage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    items_desc: "",
    total_usd: "",
    due_date: "",
  });

  // --- FETCH DATA FROM SUPABASE ---
  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_credits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error) {
      console.error("Error fetching credits:", error);
      triggerGlobalToast(t("credits.toast.load_failed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  // --- FILTERED CREDITS & STATS ---
  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const matchesSearch = c.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [credits, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return credits.reduce(
      (acc, c) => {
        const val = parseFloat(c.total_usd || 0);
        if (c.status === "Unpaid") acc.unpaid += val;
        if (c.status === "Paid") acc.paid += val;
        return acc;
      },
      { unpaid: 0, paid: 0 },
    );
  }, [credits]);

  // --- HANDLE IMAGE SELECTION ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // --- UPLOAD IMAGE TO SUPABASE STORAGE ---
  const uploadImage = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("credit_images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("credit_images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // --- SAVE CREDIT (Handles both Add & Edit) ---
  const handleSaveCredit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let uploadedImageUrl = imagePreview && !imageFile ? imagePreview : null;

      if (imageFile) {
        uploadedImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        customer_name: formData.customer_name,
        items_desc: formData.items_desc,
        total_usd: parseFloat(formData.total_usd),
        due_date: formData.due_date,
        image_url: uploadedImageUrl,
      };

      if (editingId) {
        const { error } = await supabase
          .from("customer_credits")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        triggerGlobalToast(t("credits.toast.update_success"), "success");
      } else {
        payload.status = "Unpaid";
        const { error } = await supabase
          .from("customer_credits")
          .insert([payload]);

        if (error) throw error;
        triggerGlobalToast(t("credits.toast.save_success"), "success");
      }

      resetForm();
      fetchCredits();
    } catch (error) {
      console.error("Error saving credit:", error);
      triggerGlobalToast(t("credits.toast.save_failed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- PREPARE MODAL FOR EDITING ---
  const openEditModal = (credit) => {
    setEditingId(credit.id);
    setFormData({
      customer_name: credit.customer_name || "",
      items_desc: credit.items_desc || "",
      total_usd: credit.total_usd || "",
      due_date: credit.due_date || "",
    });
    setImagePreview(credit.image_url || null);
    setImageFile(null);
    setShowModal(true);
  };

  // --- DELETE CREDIT ---
  const handleDeleteCredit = async (id, name) => {
    const confirm = window.confirm(
      t("credits.prompt.delete_confirm", { name }),
    );
    if (!confirm) return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("customer_credits")
        .delete()
        .eq("id", id);

      if (error) throw error;

      triggerGlobalToast(
        t("credits.toast.delete_success", { name }),
        "success",
      );
      fetchCredits();
    } catch (error) {
      console.error("Error deleting:", error);
      triggerGlobalToast(t("credits.toast.delete_failed"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      customer_name: "",
      items_desc: "",
      total_usd: "",
      due_date: "",
    });
    setImageFile(null);
    setImagePreview(null);
  };

  // --- MARK AS PAID (FULL AMOUNT) ---
  const handleMarkAsPaid = async (id, name) => {
    const confirm = window.confirm(
      t("credits.prompt.pay_full_confirm", { name }),
    );
    if (!confirm) return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("customer_credits")
        .update({ status: "Paid" })
        .eq("id", id);

      if (error) throw error;

      triggerGlobalToast(
        t("credits.toast.pay_full_success", { name }),
        "success",
      );
      fetchCredits();
    } catch (error) {
      console.error("Error updating status:", error);
      triggerGlobalToast(t("credits.toast.update_status_failed"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  // --- 🏆 NEW: HANDLE PARTIAL PAYMENT ---
  const handlePartialPayment = async (e) => {
    e.preventDefault();
    const amountToPay = parseFloat(partialAmount);

    if (
      !amountToPay ||
      amountToPay <= 0 ||
      amountToPay > paymentData.total_usd
    ) {
      alert(t("credits.prompt.invalid_amount"));
      return;
    }

    setProcessingId(paymentData.id);
    setIsSaving(true);

    try {
      if (amountToPay === paymentData.total_usd) {
        // If they paid the exact full amount, just mark the whole thing as paid
        await supabase
          .from("customer_credits")
          .update({ status: "Paid" })
          .eq("id", paymentData.id);
      } else {
        // 1. Reduce the original Unpaid record by the amount paid
        const newBalance = paymentData.total_usd - amountToPay;
        await supabase
          .from("customer_credits")
          .update({ total_usd: newBalance })
          .eq("id", paymentData.id);

        // 2. Create a new "Paid" receipt record so your "Total Collected" stat tracks the money
        await supabase.from("customer_credits").insert([
          {
            customer_name: paymentData.customer_name,
            total_usd: amountToPay,
            status: "Paid",
            items_desc:
              `${t("credits.table.partial_pay_prefix")} ${paymentData.items_desc || ""}`.trim(),
            due_date: new Date().toISOString().split("T")[0],
            image_url: paymentData.image_url,
          },
        ]);
      }

      triggerGlobalToast(
        t("credits.toast.partial_pay_success", { amount: fmt(amountToPay) }),
        "success",
      );
      setShowPaymentModal(false);
      setPartialAmount("");
      setPaymentData(null);
      fetchCredits();
    } catch (error) {
      console.error("Error processing partial payment:", error);
      triggerGlobalToast(t("credits.toast.payment_failed"), "error");
    } finally {
      setIsSaving(false);
      setProcessingId(null);
    }
  };

  return (
    <>
      <style>
        {`
          .credits-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
          .custom-scrollbar::-webkit-scrollbar { height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          .form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          .modal-content { background: #fff; border-radius: 20px; width: 92%; max-width: 500px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto; }
          .form-input { width: 100%; padding: 12px 16px; border: 1px solid ${COLORS.border}; border-radius: 10px; outline: none; box-sizing: border-box; font-size: 16px; transition: all 0.2s ease; }
          .form-input:focus { border-color: ${COLORS.primary}; box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1); }
          .action-btn { border: none; padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
          .action-btn:hover { opacity: 0.8; }
          @media (max-width: 600px) { .credits-header { flex-direction: column; align-items: flex-start; } .credits-header > button { width: 100%; } }
          @media (min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } .modal-content { padding: 32px; } }
        `}
      </style>

      {/* --- HEADER SECTION --- */}
      <div className="credits-header">
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            color: COLORS.text,
            fontWeight: 700,
          }}
        >
          {t("credits.header.title")}
          {""}
          <span style={{ color: COLORS.muted, fontWeight: 500 }}>
            ({filteredCredits.length})
          </span>
        </h2>
        <Button onClick={() => setShowModal(true)}>
          <FiPlus size={18} style={{ marginRight: 6 }} />{" "}
          {t("credits.header.add_credit")}
        </Button>
      </div>

      {/* --- BUSINESS FINANCIAL SUMMARY CARDS --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#FEE2E2",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #FCA5A5",
          }}
        >
          <div
            style={{
              color: "#991B1B",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {t("credits.stats.total_unpaid")}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "#991B1B",
              marginTop: 8,
            }}
          >
            {fmt(stats.unpaid)}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#B91C1C",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            {fmtKHR(stats.unpaid)}
          </div>
        </div>
        <div
          style={{
            background: "#D1FAE5",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #6EE7B7",
          }}
        >
          <div
            style={{
              color: "#065F46",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {t("credits.stats.total_collected")}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "#065F46",
              marginTop: 8,
            }}
          >
            {fmt(stats.paid)}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#047857",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            {fmtKHR(stats.paid)}
          </div>
        </div>
      </div>

      {/* --- FILTER CONTROLS BAR --- */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <FiSearch
            size={18}
            color={COLORS.muted}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={t("credits.filters.search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 42px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            fontSize: 14,
            outline: "none",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <option value="All">{t("credits.filters.all_status")}</option>
          <option value="Unpaid">{t("credits.filters.unpaid")}</option>
          <option value="Paid">{t("credits.filters.paid")}</option>
        </select>
      </div>

      {/* --- TABLE SECTION --- */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div className="custom-scrollbar" style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}
          >
            <thead>
              <tr style={{ background: COLORS.surface }}>
                {[
                  t("credits.table.th_customer"),
                  t("credits.table.th_items"),
                  "USD",
                  "KHR",
                  t("credits.table.th_dates"),
                  t("credits.table.th_status"),
                  t("credits.table.th_action"),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      ...tableCell,
                      textAlign: "left",
                      color: COLORS.muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: 12,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tableCell,
                      textAlign: "center",
                      color: COLORS.muted,
                      padding: 60,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 500 }}>
                      {t("credits.table.loading")}
                    </span>
                  </td>
                </tr>
              ) : filteredCredits.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tableCell,
                      textAlign: "center",
                      color: COLORS.muted,
                      padding: "80px 20px",
                    }}
                  >
                    <FiInbox
                      size={48}
                      color="#D1D5DB"
                      style={{ marginBottom: 16 }}
                    />
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: COLORS.text,
                        marginBottom: 4,
                      }}
                    >
                      {t("credits.table.no_results")}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {t("credits.table.no_results_desc")}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCredits.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderTop: `1px solid ${COLORS.border}`,
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = COLORS.surface)
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        ...tableCell,
                        color: COLORS.text,
                        fontWeight: 600,
                      }}
                    >
                      {c.customer_name}
                    </td>

                    <td style={tableCell}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt="Credit Item"
                            onClick={() => setViewImage(c.image_url)}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              objectFit: "cover",
                              border: `1px solid ${COLORS.border}`,
                              cursor: "zoom-in",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: COLORS.surface,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9ca3af",
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <FiImage size={20} />
                          </div>
                        )}
                        <div
                          style={{
                            color: COLORS.muted,
                            fontSize: 14,
                            maxWidth: 180,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.items_desc || t("credits.table.no_description")}
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        ...tableCell,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {fmt(c.total_usd)}
                    </td>
                    <td
                      style={{
                        ...tableCell,
                        color: COLORS.muted,
                        fontWeight: 500,
                      }}
                    >
                      {fmtKHR(c.total_usd)}
                    </td>

                    <td style={tableCell}>
                      <div
                        style={{
                          color: COLORS.muted,
                          fontSize: 14,
                          marginBottom: 4,
                        }}
                      >
                        {t("credits.table.bought_date")}{" "}
                        {new Date(c.created_at).toISOString().split("T")[0]}
                      </div>
                      <div
                        style={{
                          color:
                            c.status === "Unpaid" ? "#EF4444" : COLORS.muted,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {t("credits.table.due_date")} {c.due_date}
                      </div>
                    </td>

                    <td style={tableCell}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor:
                            c.status === "Paid" ? "#D1FAE5" : "#FEE2E2",
                          color: c.status === "Paid" ? "#059669" : "#DC2626",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td style={tableCell}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {c.status === "Unpaid" ? (
                          <>
                            {/* 🏆 Full Payment Button */}
                            <button
                              onClick={() =>
                                handleMarkAsPaid(c.id, c.customer_name)
                              }
                              disabled={processingId === c.id}
                              style={{
                                background: COLORS.primary,
                                color: "#fff",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: 8,
                                cursor:
                                  processingId === c.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              title={t("credits.table.tooltip_full")}
                            >
                              <FiCheckCircle size={14} />{" "}
                              {t("credits.table.btn_full")}
                            </button>

                            {/* 🏆 Partial Payment Button */}
                            <button
                              onClick={() => {
                                setPaymentData(c);
                                setShowPaymentModal(true);
                              }}
                              disabled={processingId === c.id}
                              style={{
                                background: "#EFF6FF",
                                color: COLORS.primary,
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: 8,
                                cursor:
                                  processingId === c.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              title={t("credits.table.tooltip_partial")}
                            >
                              <FiDollarSign size={14} />{" "}
                              {t("credits.table.btn_partial")}
                            </button>
                          </>
                        ) : (
                          <span
                            style={{
                              color: COLORS.muted,
                              fontSize: 13,
                              fontWeight: 600,
                              background: COLORS.surface,
                              padding: "6px 12px",
                              borderRadius: 8,
                            }}
                          >
                            {t("credits.table.settled")}
                          </span>
                        )}

                        <button
                          className="action-btn"
                          onClick={() => openEditModal(c)}
                          style={{
                            background: COLORS.surface,
                            color: COLORS.text,
                            border: `1px solid ${COLORS.border}`,
                          }}
                          title={t("credits.table.tooltip_edit")}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() =>
                            handleDeleteCredit(c.id, c.customer_name)
                          }
                          disabled={processingId === c.id}
                          style={{
                            background: COLORS.dangerBg,
                            color: COLORS.danger,
                          }}
                          title={t("credits.table.tooltip_delete")}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 🏆 NEW: PARTIAL PAYMENT MODAL --- */}
      {showPaymentModal && paymentData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17, 24, 39, 0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, color: COLORS.text }}>
                {t("credits.payment.title", {
                  name: paymentData.customer_name,
                })}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPartialAmount("");
                }}
                style={{
                  background: COLORS.surface,
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.muted,
                  padding: 8,
                  borderRadius: 999,
                  display: "flex",
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div
              style={{
                background: "#FEF3C7",
                padding: 16,
                borderRadius: 12,
                marginBottom: 20,
                border: "1px solid #FDE68A",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#B45309",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {t("credits.payment.current_debt")}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#92400E",
                  marginTop: 4,
                }}
              >
                {fmt(paymentData.total_usd)}
              </div>
            </div>

            <form
              onSubmit={handlePartialPayment}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: COLORS.text,
                  }}
                >
                  {t("credits.payment.amount_received")}
                </label>
                <div style={{ position: "relative" }}>
                  <FiDollarSign
                    size={18}
                    color={COLORS.muted}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentData.total_usd}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 42px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: 16,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: COLORS.muted }}>
                    {t("credits.payment.partial")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPartialAmount(paymentData.total_usd)}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.primary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {t("credits.payment.pay_all")}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                style={{
                  width: "100%",
                  padding: 16,
                  fontSize: 16,
                  borderRadius: 12,
                }}
              >
                {isSaving
                  ? t("credits.payment.saving")
                  : t("credits.payment.confirm")}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT CREDIT MODAL --- */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17, 24, 39, 0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div className="modal-content">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 20, color: COLORS.text }}>
                {editingId
                  ? t("credits.form.title_edit")
                  : t("credits.form.title_add")}
              </h3>
              <button
                onClick={resetForm}
                style={{
                  background: COLORS.surface,
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.muted,
                  padding: 8,
                  borderRadius: 999,
                  display: "flex",
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveCredit}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: COLORS.text,
                  }}
                >
                  {t("credits.form.lbl_receipt")}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
                <div
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    border: `2px dashed ${COLORS.border}`,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "#ffffff",
                    padding: "24px",
                    minHeight: 180,
                    transition: "all 0.2s ease",
                  }}
                >
                  {imagePreview ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 12,
                          objectFit: "cover",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                      <span
                        style={{
                          color: COLORS.primary,
                          fontWeight: 600,
                          fontSize: 13,
                          background: "#EFF6FF",
                          padding: "6px 16px",
                          borderRadius: 999,
                        }}
                      >
                        {t("credits.form.change_photo")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          background: COLORS.surface,
                          padding: 12,
                          borderRadius: 999,
                          marginBottom: 12,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <FiUploadCloud size={24} color={COLORS.primary} />
                      </div>
                      <span
                        style={{
                          color: COLORS.primary,
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {t("credits.form.choose_photo")}
                      </span>
                      <span
                        style={{
                          color: COLORS.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {t("credits.form.optional")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: COLORS.text,
                  }}
                >
                  {t("credits.form.lbl_name")}
                </label>
                <input
                  required
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder={t("credits.form.placeholder_name")}
                  className="form-input"
                />
              </div>

              <div className="form-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: COLORS.text,
                    }}
                  >
                    {t("credits.form.lbl_total")}
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.total_usd}
                    onChange={(e) =>
                      setFormData({ ...formData, total_usd: e.target.value })
                    }
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: COLORS.text,
                    }}
                  >
                    {t("credits.form.lbl_due_date")}
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="form-input"
                    style={{ fontFamily: "inherit" }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: COLORS.text,
                  }}
                >
                  {t("credits.form.lbl_desc")}
                </label>
                <textarea
                  value={formData.items_desc}
                  onChange={(e) =>
                    setFormData({ ...formData, items_desc: e.target.value })
                  }
                  placeholder={t("credits.form.placeholder_desc")}
                  className="form-input"
                  style={{
                    minHeight: 80,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                style={{
                  width: "100%",
                  padding: 16,
                  fontSize: 16,
                  marginTop: 8,
                  borderRadius: 12,
                }}
              >
                {isSaving
                  ? t("credits.payment.saving")
                  : editingId
                    ? t("credits.form.btn_update")
                    : t("credits.form.btn_save")}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX (View Image Fullscreen) --- */}
      {viewImage && (
        <div
          onClick={() => setViewImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewImage(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 999,
                backdropFilter: "blur(4px)",
              }}
            >
              <FiX size={24} />
            </button>
            <img
              src={viewImage}
              alt="Full Credit Items"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: 12,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
