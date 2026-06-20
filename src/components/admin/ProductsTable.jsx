import { useState, useMemo } from "react";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
} from "react-icons/fi";
import { fmt } from "../../utils/currency";

export default function ProductsTable({ products, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch = prod.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
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
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Search & Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: 16,
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 200px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        >
          <FiSearch color="#9ca3af" size={18} />
          <input
            type="text"
            placeholder="Search product name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: 14,
            }}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#fff",
            fontSize: 14,
            outline: "none",
            flex: "1 1 150px",
          }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Responsive List Container */}
      <div>
        {/* Desktop Header */}
        <div
          className="desktop-view"
          style={{
            display: "flex",
            padding: "12px 16px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ flex: 2 }}>Item</div>
          <div style={{ flex: 1 }}>Category</div>
          <div style={{ flex: 1 }}>Price</div>
          <div style={{ flex: 1 }}>Stock</div>
          <div style={{ flex: 1, textAlign: "right" }}>Actions</div>
        </div>

        {/* CSS Block: 
          On screens larger than 768px, show 'desktop-view' and hide 'mobile-view'.
          On screens smaller than 768px, hide 'desktop-view' and show 'mobile-view'.
        */}
        <style>{`
          .mobile-view { display: none !important; }
          .desktop-view { display: flex; }
          
          @media (max-width: 768px) {
            .desktop-view { display: none !important; }
            .mobile-view { display: flex !important; }
          }
        `}</style>

        {/* Product Rows */}
        {paginatedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            No products found.
          </div>
        ) : (
          paginatedProducts.map((p) => (
            <div key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              {/* --- DESKTOP ROW LAYOUT --- */}
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
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: "#f3f4f6",
                      borderRadius: 8,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {p.image ? (
                      <img
                        src={
                          p.image.startsWith("http") ? p.image : `/${p.image}`
                        }
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <FiImage color="#9ca3af" />
                    )}
                  </div>
                  <span
                    style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}
                  >
                    {p.name}
                  </span>
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span
                    style={{
                      background: "#f3f4f6",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontWeight: 500,
                      color: "#4b5563",
                    }}
                  >
                    {p.category}
                  </span>
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                  {fmt(p.price)}
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span
                    style={{
                      color: p.stock > 0 ? "#10b981" : "#ef4444",
                      background: p.stock > 0 ? "#d1fae5" : "#fee2e2",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                  </span>
                </div>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <button
                    onClick={() => onEdit(p)}
                    style={{
                      padding: 8,
                      background: "#eff6ff",
                      border: "none",
                      borderRadius: 6,
                      color: "#0066ff",
                      cursor: "pointer",
                      marginRight: 8,
                    }}
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(p.id, p.name)}
                    style={{
                      padding: 8,
                      background: "#fee2e2",
                      border: "none",
                      borderRadius: 6,
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>

              {/* --- MOBILE APP CARD LAYOUT --- */}
              <div
                className="mobile-view"
                style={{
                  padding: "16px",
                  gap: "14px",
                  alignItems: "flex-start",
                }}
              >
                {/* Image on Left */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#f3f4f6",
                    borderRadius: 10,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {p.image ? (
                    <img
                      src={p.image.startsWith("http") ? p.image : `/${p.image}`}
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <FiImage color="#9ca3af" size={24} />
                  )}
                </div>

                {/* Content on Right */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Title */}
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#111827",
                      fontSize: 15,
                      marginBottom: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </div>

                  {/* Category & Stock Badges */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        background: "#f3f4f6",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#4b5563",
                      }}
                    >
                      {p.category}
                    </span>
                    <span
                      style={{
                        color: p.stock > 0 ? "#065f46" : "#991b1b",
                        background: p.stock > 0 ? "#d1fae5" : "#fee2e2",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                    </span>
                  </div>

                  {/* Price & Actions Row */}
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
                        style={{
                          padding: 6,
                          background: "#eff6ff",
                          border: "none",
                          borderRadius: 6,
                          color: "#0066ff",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(p.id, p.name)}
                        style={{
                          padding: 6,
                          background: "#fee2e2",
                          border: "none",
                          borderRadius: 6,
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "#f9fafb",
        }}
      >
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          Showing page <strong>{currentPage}</strong> of{" "}
          <strong>{totalPages}</strong>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            style={{
              padding: 6,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            style={{
              padding: 6,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "#fff",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
