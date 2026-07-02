import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiAlertTriangle,
} from "react-icons/fi";
import { fmt } from "../../utils/currency";

// --- REUSABLE LOADING SPINNER ---
const Spinner = ({ color = "#6B7280" }) => (
  <svg
    style={{
      animation: "spin 1s linear infinite",
      width: 16,
      height: 16,
      color: color,
    }}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      style={{ opacity: 0.25 }}
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      style={{ opacity: 0.75 }}
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

export default function ProductsTable({
  products = [],
  onEdit,
  onDelete,
  onToggleStock,
  processingId,
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- 🚀 BARCODE SCANNER LISTENER ---
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }

      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        setSearchQuery(barcodeBuffer);
        setCurrentPage(1);
        barcodeBuffer = "";
      } else if (e.key !== "Enter" && e.key.length === 1) {
        barcodeBuffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- FILTERING & PAGINATION LOGIC ---
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        prod.name?.toLowerCase().includes(searchLower) ||
        prod.barcode?.toLowerCase().includes(searchLower);

      const matchesCategory =
        selectedCategory === "All" || prod.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  return (
    <div style={styles.card}>
      {/* --- SEARCH & FILTER BAR --- */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrapper}>
          <FiSearch color="#9ca3af" size={18} />
          <input
            type="text"
            placeholder={t(
              "products_table.search_placeholder",
              "Search by name or barcode...",
            )}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.searchInput}
          />
        </div>

        {categories.length > 1 && (
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.selectInput}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All"
                  ? t("products_table.all_categories", "All Categories")
                  : cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* --- RESPONSIVE TABLE CONTAINER --- */}
      <div>
        <div className="desktop-view" style={styles.desktopHeaderRow}>
          <div style={{ flex: 2 }}>
            {t("products_table.header_item", "Item")}
          </div>
          <div style={{ flex: 1 }}>
            {t("products_table.header_price", "Price")}
          </div>
          <div style={{ flex: 1 }}>
            {t("products_table.header_status", "Status")}
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            {t("products_table.header_actions", "Actions")}
          </div>
        </div>

        <style>{`
          .mobile-view { display: none !important; }
          .desktop-view { display: flex; }
          
          @media (max-width: 768px) {
            .desktop-view { display: none !important; }
            .mobile-view { display: flex !important; }
          }
        `}</style>

        {paginatedProducts.length === 0 ? (
          <div style={styles.emptyState}>
            {t("products_table.no_products", "No products found.")}
          </div>
        ) : (
          paginatedProducts.map((p) => {
            const isProcessing = processingId === p.id;
            const stockQty = p.stock || 0;
            const isLowStock = stockQty < 5 && p.in_stock;

            return (
              <div
                key={p.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  backgroundColor: isLowStock ? "#FEF9C3" : "#FFFFFF",
                  opacity: isProcessing ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {/* --- DESKTOP ROW --- */}
                <div
                  className="desktop-view"
                  style={{ alignItems: "center", padding: "12px 16px" }}
                >
                  <div
                    style={{
                      flex: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={styles.imageBox}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={styles.image} />
                      ) : (
                        <FiImage color="#9ca3af" />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                          fontSize: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {p.name}
                        {isLowStock && (
                          <span style={styles.lowStockBadge}>
                            <FiAlertTriangle size={12} />{" "}
                            {t("products_table.low_stock", "Low Stock")} (
                            {stockQty})
                          </span>
                        )}
                      </div>
                      {p.barcode && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          {p.barcode}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      fontWeight: 700,
                      color: "#0066ff",
                      fontSize: 14,
                    }}
                  >
                    {fmt(p.price)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <button
                        onClick={() => onToggleStock(p.id, p.in_stock, p.name)}
                        disabled={isProcessing}
                        style={{
                          ...styles.toggleTrack,
                          backgroundColor: p.in_stock ? "#0066FF" : "#D1D5DB",
                          cursor: isProcessing ? "not-allowed" : "pointer",
                        }}
                      >
                        <div
                          style={{
                            ...styles.toggleThumb,
                            transform: p.in_stock
                              ? "translateX(20px)"
                              : "translateX(0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isProcessing && (
                            <Spinner
                              color={p.in_stock ? "#10B981" : "#9CA3AF"}
                            />
                          )}
                        </div>
                      </button>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: p.in_stock ? "#0052CC" : "#6B7280",
                        }}
                      >
                        {p.in_stock
                          ? stockQty > 0
                            ? `${stockQty} ${t("products_table.in_stock", "In Stock")}`
                            : t("products_table.in_stock", "In Stock")
                          : t("products_table.hidden", "Hidden")}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => onEdit(p)}
                      disabled={isProcessing}
                      style={styles.editBtn}
                    >
                      <FiEdit2 size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(p.id, p.name)}
                      disabled={isProcessing}
                      style={styles.deleteBtn}
                    >
                      {isProcessing ? (
                        <Spinner color="#DC2626" />
                      ) : (
                        <FiTrash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {/* --- MOBILE APP CARD --- */}
                <div
                  className="mobile-view"
                  style={{
                    padding: "16px",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.imageBox,
                      width: 64,
                      height: 64,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={styles.image} />
                    ) : (
                      <FiImage color="#9ca3af" size={24} />
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                        fontSize: 15,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {p.name}
                      {isLowStock && (
                        <span style={styles.lowStockBadge}>
                          <FiAlertTriangle size={12} /> ({stockQty}){" "}
                          {t("products_table.left", "left")}
                        </span>
                      )}
                    </div>

                    {p.barcode && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          marginBottom: 8,
                        }}
                      >
                        {p.barcode}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <button
                        onClick={() => onToggleStock(p.id, p.in_stock, p.name)}
                        disabled={isProcessing}
                        style={{
                          ...styles.toggleTrack,
                          backgroundColor: p.in_stock ? "#10B981" : "#D1D5DB",
                        }}
                      >
                        <div
                          style={{
                            ...styles.toggleThumb,
                            transform: p.in_stock
                              ? "translateX(20px)"
                              : "translateX(0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isProcessing && (
                            <Spinner
                              color={p.in_stock ? "#10B981" : "#9CA3AF"}
                            />
                          )}
                        </div>
                      </button>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: p.in_stock ? "#10B981" : "#6B7280",
                        }}
                      >
                        {p.in_stock
                          ? stockQty > 0
                            ? `${stockQty} ${t("products_table.in_stock", "In Stock")}`
                            : t("products_table.in_stock", "In Stock")
                          : t("products_table.hidden", "Hidden")}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#0066ff",
                        }}
                      >
                        {fmt(p.price)}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => onEdit(p)}
                          disabled={isProcessing}
                          style={styles.editBtn}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(p.id, p.name)}
                          disabled={isProcessing}
                          style={styles.deleteBtn}
                        >
                          {isProcessing ? (
                            <Spinner color="#DC2626" />
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      {totalPages > 1 && (
        <div style={styles.paginationBar}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {t("products_table.showing_page", "Showing page")}{" "}
            <strong>{currentPage}</strong> {t("products_table.of", "of")}{" "}
            <strong>{totalPages}</strong>
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              style={{
                ...styles.pageBtn,
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              style={{
                ...styles.pageBtn,
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },
  searchBar: {
    display: "flex",
    gap: 16,
    padding: 16,
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    flexWrap: "wrap",
  },
  searchInputWrapper: {
    flex: "1 1 200px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  searchInput: { border: "none", outline: "none", width: "100%", fontSize: 14 },
  selectInput: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 14,
    outline: "none",
    flex: "1 1 150px",
  },
  desktopHeaderRow: {
    display: "flex",
    padding: "12px 16px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  emptyState: { textAlign: "center", padding: 40, color: "#9ca3af" },
  imageBox: {
    width: 44,
    height: 44,
    background: "#f3f4f6",
    borderRadius: 8,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    padding: 2,
    backgroundColor: "#fff",
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 24,
    border: "none",
    padding: 2,
    transition: "background-color 0.3s ease",
    display: "flex",
    alignItems: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition: "transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
  },
  editBtn: {
    padding: 8,
    background: "#eff6ff",
    border: "none",
    borderRadius: 6,
    color: "#0066ff",
    cursor: "pointer",
  },
  deleteBtn: {
    padding: 8,
    background: "#fee2e2",
    border: "none",
    borderRadius: 6,
    color: "#DD2D4A",
    cursor: "pointer",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f9fafb",
  },
  pageBtn: {
    padding: 6,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
  },
  lowStockBadge: {
    background: "#DD2D4A",
    color: "#FFF",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
};
