export default function Modal({ open, onClose, children, title, wide }) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={styles.overlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.modalBox,
          maxWidth: wide ? 720 : 480, // Dynamically changes width based on props
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
    </div>
  );
}

// ==========================================
// COMPONENT STYLES
// ==========================================
const styles = {
  overlay: {
    position: "fixed",
    inset: 0, // Shorthand for top, right, bottom, left: 0
    background: "rgba(0,0,0,0.45)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16, // Ensures the modal never touches the absolute edge of tiny phones
  },
  modalBox: {
    background: "#fff",
    borderRadius: 20,
    width: "100%",
    maxHeight: "85dvh", // 🏆 Dynamic Viewport Height: Perfect for mobile browsers
    display: "flex",
    flexDirection: "column", // Stacks the header on top of the content
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6", // Adds a clean divider line
    flexShrink: 0, // Prevents the header from getting squished when scrolling
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
    overflowY: "auto", // 🏆 Tells the content inside to scroll independently
    flex: 1, // Fills the remaining space left by the header
  },
};
