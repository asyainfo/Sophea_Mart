export default function Row({ label, value, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 0",
      }}
    >
      <span
        style={{ fontSize: 13, color: "#6b7280", fontWeight: bold ? 600 : 400 }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: bold ? 700 : 500,
          color: bold ? "#0066FF" : "#111",
        }}
      >
        {value}
      </span>
    </div>
  );
}
