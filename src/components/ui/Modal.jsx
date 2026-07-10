import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, children, title, wide }) {
  // 🏆 UX BONUS: Prevents the background page from scrolling when the modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div onClick={onClose} style={styles.overlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.modalBox,
          maxWidth: wide ? 720 : 480,
        }}
      >
        {/* --- HEADER --- */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div style={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ==========================================
// COMPONENT STYLES
// ==========================================
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 999999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    background: "#fff",
    borderRadius: 20,
    width: "100%",
    maxHeight: "85dvh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111",
  },
  closeButton: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    width: 32,
    height: 32,
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    transition: "background 0.2s",
  },
  content: {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
  },
};
