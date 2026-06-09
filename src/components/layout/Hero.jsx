import { useState } from "react";
// 1. Added FiGrid to the imports for the "All" icon
import {
  FiSearch,
  FiCoffee,
  FiPackage,
  FiShoppingBag,
  FiGrid,
} from "react-icons/fi";
import { FaBaby } from "react-icons/fa";

export default function Hero({
  search,
  setSearch,
  activeCategory,
  setCategory,
}) {
  const [focused, setFocused] = useState(false);

  const categories = [
    // 2. Added the "All" category object to the top of the list
    {
      name: "All",
      icon: <FiGrid size={16} />,
    },
    {
      name: "Drinks",
      icon: <FiCoffee size={16} />,
    },
    {
      name: "Ingredients",
      icon: <FiPackage size={16} />,
    },
    {
      name: "Snacks",
      icon: <FiShoppingBag size={16} />,
    },
    {
      name: "Baby Needs",
      icon: <FaBaby size={16} />,
    },
  ];

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #dbeafe 35%, #bfdbfe 70%, #ffffff 100%)",
        padding: "48px 24px 40px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#bed2ecd1",
            color: "#2563EB",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.8,
          }}
        >
          <FiPackage size={12} />
          <span>FRESH DAILY</span>
        </div>

        {/* Heading */}
        <h1
          style={{
            margin: "18px 0 10px",
            fontSize: 42,
            fontWeight: 900,
            color: "#111827",
            letterSpacing: -1,
            lineHeight: 1.15,
          }}
        >
          សូមស្វាគមន៍មកកាន់{" "}
          <span style={{ color: "#2563EB" }}>SOPHEA MART</span>
        </h1>

        {/* Description */}
        <p
          style={{
            color: "#4B5563",
            fontSize: 16,
            margin: "0 0 30px",
            lineHeight: 1.7,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          ផ្សារម៉ាតជិតផ្ទះរបស់អ្នក មានលក់ភេសជ្ជៈត្រជាក់ៗ គ្រឿងទេសប្រចាំថ្ងៃ
          អាហារសម្រន់ឆ្ងាញ់ៗ និងសម្ភារៈចាំបាច់សម្រាប់ទារក
          ដើម្បីបំពេញរាល់តម្រូវការប្រចាំថ្ងៃរបស់អ្នក។
        </p>

        {/* Search */}
        <div
          style={{
            position: "relative",
            marginBottom: 28,
          }}
        >
          <FiSearch
            size={20}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6B7280",
              pointerEvents: "none",
            }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for drinks, snacks, baby needs..."
            style={{
              width: "100%",
              padding: "15px 20px 15px 48px",
              border: focused ? "1px solid #2563EB" : "1px solid #E5E7EB",
              borderRadius: 16,
              background: "#FFFFFF",
              fontSize: 15,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              boxShadow: focused
                ? "0 0 0 4px rgba(37,99,235,0.15)"
                : "0 4px 16px rgba(0,0,0,0.05)",
            }}
          />
        </div>

        {/* Categories */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setCategory(active ? "All" : cat.name)}
                style={{
                  background: active ? "#2563EB" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#374151",
                  border: `1px solid ${active ? "#2563EB" : "#E5E7EB"}`,
                  borderRadius: 999,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                  boxShadow: active
                    ? "0 8px 20px rgba(37,99,235,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
