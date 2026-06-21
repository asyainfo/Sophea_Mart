import { useState } from "react";
import {
  FiSearch,
  FiPackage,
  FiGrid,
  FiScissors,
  FiLayers,
} from "react-icons/fi";
import {
  FaBaby,
  FaDollyFlatbed,
  FaGulp,
  FaShower,
  FaAirFreshener,
  FaTools,
  FaEyeDropper,
  FaMortarPestle,
  FaCalendarCheck,
} from "react-icons/fa";
import {
  BiSolidCoffeeBean,
  BiHeart,
  BiSolidBolt,
  BiSolidBowlHot,
  BiSolidFirstAid,
  BiSolidPizza,
  BiSolidSpa,
  BiSolidMagicWand,
} from "react-icons/bi";
import { GiClothes, GiFlour } from "react-icons/gi";
import { PiCowFill } from "react-icons/pi";
import { FaIceCream, FaKitchenSet } from "react-icons/fa6";

// 1. Moved categories OUTSIDE the component so it doesn't re-render
// every time the user types in the search bar (Performance boost!)
const CATEGORIES = [
  { name: "All", icon: <FiGrid size={16} /> },
  { name: "ជម្រើសល្អៗបំផុត", icon: <BiHeart size={16} /> },
  { name: "ភេសជ្ជៈ", icon: <FaGulp size={16} /> },
  { name: "ការ៉េម", icon: <FaIceCream size={16} /> },
  { name: "គ្រឿងផ្សំ", icon: <FaMortarPestle size={16} /> },
  { name: "អាហារសម្រន់", icon: <BiSolidPizza size={16} /> },
  { name: "សម្ភារៈទារក", icon: <FaBaby size={16} /> },
  { name: "ឱសថស្ថាន", icon: <BiSolidFirstAid size={16} /> },
  { name: "ការថែទាំខ្លួនប្រាណ", icon: <BiSolidSpa size={16} /> },
  { name: "ថែរក្សាសម្រស់", icon: <BiSolidMagicWand size={16} /> },
  { name: "សាប៊ូកក់សក់", icon: <FaShower size={16} /> },
  { name: "គ្រឿងសម្អាង", icon: <FaAirFreshener size={16} /> },
  { name: "ផលិតផលថែរក្សាស្បែក", icon: <FaEyeDropper size={16} /> },
  { name: "គ្រឿងតុបតែងសក់", icon: <FiScissors size={16} /> },
  { name: "អេឡិចត្រូនិក", icon: <BiSolidBolt size={16} /> },
  { name: "គ្រឿងសំណង់", icon: <FaTools size={16} /> }, // Fixed 'ssize' typo here
  { name: "ផលិតផលលក់ដុំ", icon: <FiLayers size={16} /> },
  { name: "ម្សៅ", icon: <GiFlour size={16} /> },
  { name: "បរិក្ខារផ្ទះបាយ", icon: <FaKitchenSet size={16} /> },
  { name: "កាហ្វេ និងតែ", icon: <BiSolidCoffeeBean size={16} /> },
  { name: "អាហារកំប៉ុង", icon: <BiSolidBowlHot size={16} /> },
  { name: "ឧបករណ៍ចាំបាច់នានា", icon: <FaCalendarCheck size={16} /> },
  { name: "សម្លៀកបំពាក់", icon: <GiClothes size={16} /> },
  { name: "ទឹកដោះគោ", icon: <PiCowFill size={16} /> },
  { name: "សម្ភារៈទូទៅ", icon: <FaDollyFlatbed size={16} /> },
];

export default function Hero({
  search,
  setSearch,
  activeCategory,
  setCategory,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={styles.heroWrapper}>
      {/* CSS injection to hide the scrollbar specifically for the category list */}
      <style>
        {`
          .hide-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div style={styles.container}>
        {/* Badge */}
        <div style={styles.badge}>
          <FiPackage size={12} />
          <span>FRESH DAILY</span>
        </div>

        {/* Heading */}
        <h1 style={styles.heading}>
          សូមស្វាគមន៍មកកាន់{" "}
          <span style={{ color: "#2563EB" }}>SOPHEA MART</span>
        </h1>

        {/* Description */}
        <p style={styles.description}>
          ផ្សារម៉ាតជិតផ្ទះរបស់អ្នក មានលក់ភេសជ្ជៈត្រជាក់ៗ គ្រឿងទេសប្រចាំថ្ងៃ
          អាហារសម្រន់ឆ្ងាញ់ៗ និងសម្ភារៈចាំបាច់សម្រាប់ទារក
          ដើម្បីបំពេញរាល់តម្រូវការប្រចាំថ្ងៃរបស់អ្នក។
        </p>

        {/* Search Input */}
        <div style={styles.searchContainer}>
          <FiSearch size={20} style={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for drinks, snacks, baby needs..."
            style={{
              ...styles.searchInput,
              border: focused ? "1px solid #2563EB" : "1px solid #E5E7EB",
              boxShadow: focused
                ? "0 0 0 4px rgba(37,99,235,0.15)"
                : "0 4px 16px rgba(0,0,0,0.05)",
            }}
          />
        </div>

        {/* Categories Slider */}
        <div className="hide-scroll" style={styles.categoriesSlider}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setCategory(active ? "All" : cat.name)}
                style={{
                  ...styles.categoryBtn,
                  background: active ? "#2563EB" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#374151",
                  border: `1px solid ${active ? "#2563EB" : "#E5E7EB"}`,
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

// ==========================================
// EXTRACTED STYLES
// ==========================================
const styles = {
  heroWrapper: {
    background:
      "linear-gradient(135deg, #f8fafc 0%, #dbeafe 35%, #bfdbfe 70%, #ffffff 100%)",
    padding: "48px 24px 40px",
    textAlign: "center",
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
  },
  badge: {
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
  },
  heading: {
    margin: "18px 0 10px",
    fontSize: 42,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: -1,
    lineHeight: 1.15,
  },
  description: {
    color: "#4B5563",
    margin: "0 0 30px",
    lineHeight: 1.7,
    fontSize: 16,
    fontWeight: 500,
  },
  searchContainer: {
    position: "relative",
    marginBottom: 28,
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6B7280",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "15px 20px 15px 48px",
    borderRadius: 16,
    background: "#FFFFFF",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },
  categoriesSlider: {
    display: "flex",
    gap: 12,
    flexWrap: "nowrap",
    overflowX: "auto",
    scrollbarWidth: "none", // Firefox
    msOverflowStyle: "none", // IE
    padding: "4px 4px 16px 4px", // Prevents box-shadows from getting cut off
    justifyContent: "flex-start",
  },
  categoryBtn: {
    flexShrink: 0,
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s ease",
  },
};
