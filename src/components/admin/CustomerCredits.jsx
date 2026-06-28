import { useState, useEffect, useRef } from "react";
import { FiPlus, FiX, FiUploadCloud, FiImage, FiInbox } from "react-icons/fi";
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
};

const tableCell = {
  padding: "16px 20px",
  fontSize: 14,
  verticalAlign: "middle",
  whiteSpace: "nowrap", // Prevents text from squishing on mobile
};

// --- GLOBAL TOAST DISPATCHER ---
const triggerGlobalToast = (message, type = "success") => {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type } }),
  );
};

export default function CustomerCredits() {
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Modal & Image State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

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
      triggerGlobalToast("Failed to load credits", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

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

  // --- ADD NEW CREDIT ---
  const handleAddCredit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let uploadedImageUrl = null;

      if (imageFile) {
        uploadedImageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from("customer_credits").insert([
        {
          customer_name: formData.customer_name,
          items_desc: formData.items_desc,
          total_usd: parseFloat(formData.total_usd),
          due_date: formData.due_date,
          image_url: uploadedImageUrl,
          status: "Unpaid",
        },
      ]);

      if (error) throw error;

      triggerGlobalToast("Credit record added successfully!", "success");
      resetForm();
      fetchCredits();
    } catch (error) {
      console.error("Error adding credit:", error);
      triggerGlobalToast("Failed to add credit", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setFormData({
      customer_name: "",
      items_desc: "",
      total_usd: "",
      due_date: "",
    });
    setImageFile(null);
    setImagePreview(null);
  };

  // --- MARK AS PAID ---
  const handleMarkAsPaid = async (id, name) => {
    const confirm = window.confirm(`Mark ${name}'s debt as Paid?`);
    if (!confirm) return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("customer_credits")
        .update({ status: "Paid" })
        .eq("id", id);

      if (error) throw error;

      triggerGlobalToast(`${name}'s debt marked as Paid!`, "success");
      fetchCredits();
    } catch (error) {
      console.error("Error updating status:", error);
      triggerGlobalToast("Failed to update status", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* Embedded CSS for Mobile Responsiveness */}
      <style>
        {`
          .credits-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            gap: 16px;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1; 
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
          }
          .form-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .modal-content {
            background: #fff;
            border-radius: 20px;
            width: 92%;
            max-width: 500px;
            padding: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-height: 90vh;
            overflow-y: auto;
          }
          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid ${COLORS.border};
            border-radius: 10px;
            outline: none;
            box-sizing: border-box;
            font-size: 16px; /* Prevents iOS auto-zoom */
            transition: all 0.2s ease;
          }
          .form-input:focus {
            border-color: ${COLORS.primary};
            box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
          }
          @media (max-width: 600px) {
            .credits-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .credits-header > button {
              width: 100%;
            }
          }
          @media (min-width: 600px) {
            .form-grid {
              grid-template-columns: 1fr 1fr;
            }
            .modal-content {
              padding: 32px;
            }
          }
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
          Customer Credits{" "}
          <span style={{ color: COLORS.muted, fontWeight: 500 }}>
            ({credits.length})
          </span>
        </h2>
        <Button onClick={() => setShowModal(true)}>
          <FiPlus size={18} style={{ marginRight: 6 }} /> Add Credit
        </Button>
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
        {/* custom-scrollbar class allows smooth swiping on mobile */}
        <div className="custom-scrollbar" style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}
          >
            <thead>
              <tr style={{ background: COLORS.surface }}>
                {[
                  "Customer Name",
                  "Items & Image",
                  "USD",
                  "KHR",
                  "Dates",
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 500 }}>
                        Loading records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : credits.length === 0 ? (
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
                      No Active Credits
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Customers who owe money will appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                credits.map((c) => (
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
                    {/* Customer Name */}
                    <td
                      style={{
                        ...tableCell,
                        color: COLORS.text,
                        fontWeight: 700,
                      }}
                    >
                      {c.customer_name}
                    </td>

                    {/* Items & Image Column */}
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
                            fontSize: 13,
                            maxWidth: 180,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.items_desc || "No description"}
                        </div>
                      </div>
                    </td>

                    {/* USD */}
                    <td
                      style={{
                        ...tableCell,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {fmt(c.total_usd)}
                    </td>

                    {/* KHR */}
                    <td
                      style={{
                        ...tableCell,
                        color: COLORS.muted,
                        fontWeight: 500,
                      }}
                    >
                      {fmtKHR(c.total_usd)}
                    </td>

                    {/* Dates */}
                    <td style={tableCell}>
                      <div
                        style={{
                          color: COLORS.muted,
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        Bought:{" "}
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
                        Due: {c.due_date}
                      </div>
                    </td>

                    {/* Status Badge */}
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

                    {/* Action Button */}
                    <td style={tableCell}>
                      {c.status === "Unpaid" ? (
                        <button
                          onClick={() =>
                            handleMarkAsPaid(c.id, c.customer_name)
                          }
                          disabled={processingId === c.id}
                          style={{
                            background: COLORS.primary,
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: 8,
                            cursor:
                              processingId === c.id ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            opacity: processingId === c.id ? 0.7 : 1,
                            transition: "all 0.2s",
                          }}
                        >
                          {processingId === c.id
                            ? "Updating..."
                            : "Mark as Paid"}
                        </button>
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
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD CREDIT MODAL --- */}
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
                បន្ថែមឥណទានអតិថិជន
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
              onSubmit={handleAddCredit}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Image Upload Area */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: COLORS.text,
                  }}
                >
                  Product Receipt / Image
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
                        Change Photo
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
                        Choose a Photo
                      </span>
                      <span
                        style={{
                          color: COLORS.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Optional
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Form Inputs */}
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
                  ឈ្មោះអតិថិជន
                </label>
                <input
                  required
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder="e.g. Asya (Neighbor)"
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
                    បំណុលសរុប (USD)
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
                    ថ្ងៃកំណត់បង់ប្រាក់
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
                  ការពិពណ៌នា (ជាជម្រើស)
                </label>
                <textarea
                  value={formData.items_desc}
                  onChange={(e) =>
                    setFormData({ ...formData, items_desc: e.target.value })
                  }
                  placeholder="បញ្ជាក់ទំនិញដែលបានទិញ..."
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
                {isSaving ? "កំពុងរក្សាទុក..." : "រក្សាទុកកំណត់ត្រាឥណទាន"}
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
