export default function Button({
  children,
  onClick,
  full,
  variant = "primary",
  small,
  disabled,
}) {
  const styles = {
    primary: { background: "#0066FF", color: "#fff", border: "none" },
    secondary: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1.5px solid #e5e7eb",
    },
    danger: { background: "#dc2626", color: "#fff", border: "none" },
    ghost: {
      background: "transparent",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        borderRadius: 10,
        padding: small ? "6px 14px" : "11px 20px",
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "all 0.15s",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = "0.88";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
    >
      {children}
    </button>
  );
}
