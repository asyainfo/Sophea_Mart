import { useState, createContext, useContext, useCallback } from "react";

// 1. Create the Context
const ToastContext = createContext(null);

// 2. Create the Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // useCallback prevents unnecessary re-renders when passing this function down
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);

    // Auto-remove after 3 seconds
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: 24, // Moved to top so it doesn't block the cart bar
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none", // Prevents invisible container from blocking clicks
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background:
                t.type === "success"
                  ? "#2469ffff"
                  : t.type === "error"
                    ? "#dc2626"
                    : "#1f2937",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              maxWidth: 320,
              pointerEvents: "auto", // Allows the actual toast to be clicked if needed
              animation: "slideInRight 0.3s ease forwards",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* CSS for the smooth slide-in animation */}
      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
}

// 3. Create the Custom Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
