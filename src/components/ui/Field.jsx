export default function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          border: "1.5px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#0066FF")}
        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
      />
    </div>
  );
}
