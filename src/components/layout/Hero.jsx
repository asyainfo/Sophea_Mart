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
  FaShoePrints,
  FaOilCan,
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
import { GiNoodles, GiSoap } from "react-icons/gi";
import { PiCowFill, PiWashingMachine } from "react-icons/pi";
import { FaIceCream, FaKitchenSet, FaSprayCanSparkles } from "react-icons/fa6";
import { useTranslation } from "react-i18next";

// 🏆 UPGRADED: Added "dbValue" (for Supabase) and "key" (for Translations)
const CATEGORIES = [
  { key: "all", dbValue: "All", icon: <FiGrid size={16} /> },
  {
    key: "best_picks",
    dbValue: "ជម្រើសល្អៗបំផុត",
    icon: <BiHeart size={16} />,
  },
  { key: "beverages", dbValue: "ភេសជ្ជៈ", icon: <FaGulp size={16} /> },
  { key: "ice_cream", dbValue: "ការ៉េម", icon: <FaIceCream size={16} /> },
  {
    key: "ingredients",
    dbValue: "គ្រឿងផ្សំ",
    icon: <FaMortarPestle size={16} />,
  },
  { key: "snacks", dbValue: "អាហារសម្រន់", icon: <BiSolidPizza size={16} /> },
  { key: "baby_needs", dbValue: "សម្ភារៈទារក", icon: <FaBaby size={16} /> },
  { key: "pharmacy", dbValue: "ឱសថស្ថាន", icon: <BiSolidFirstAid size={16} /> },
  {
    key: "body_care",
    dbValue: "ការថែទាំខ្លួនប្រាណ",
    icon: <BiSolidSpa size={16} />,
  },
  {
    key: "fragrances",
    dbValue: "គ្រឿងក្រអូប",
    icon: <FaSprayCanSparkles size={16} />,
  },
  { key: "shampoo", dbValue: "សាប៊ូកក់សក់", icon: <FaShower size={16} /> },
  {
    key: "cosmetics",
    dbValue: "គ្រឿងសម្អាង",
    icon: <FaAirFreshener size={16} />,
  },
  {
    key: "skincare",
    dbValue: "ផលិតផលថែរក្សាស្បែក",
    icon: <FaEyeDropper size={16} />,
  },
  {
    key: "hair_accessories",
    dbValue: "គ្រឿងតុបតែងសក់",
    icon: <FiScissors size={16} />,
  },
  {
    key: "washing_soap",
    dbValue: "សាប៊ូបោកខោអាវ",
    icon: <PiWashingMachine size={16} />,
  },
  {
    key: "beauty_care",
    dbValue: "ថែរក្សាសម្រស់",
    icon: <BiSolidMagicWand size={16} />,
  },
  {
    key: "washing_body",
    dbValue: "សាប៊ូដុះខ្លួន",
    icon: <GiSoap size={16} />,
  },
  {
    key: "electronics",
    dbValue: "អេឡិចត្រូនិក",
    icon: <BiSolidBolt size={16} />,
  },
  {
    key: "shoes",
    dbValue: "ស្បែកជើង",
    icon: <FaShoePrints size={16} />,
  },
  { key: "construction", dbValue: "គ្រឿងសំណង់", icon: <FaTools size={16} /> },
  { key: "wholesale", dbValue: "ផលិតផលលក់ដុំ", icon: <FiLayers size={16} /> },
  { key: "flour", dbValue: "ម្សៅ", icon: <GiFlour size={16} /> },
  {
    key: "frying_oil",
    dbValue: "ប្រេងឆា",
    icon: <FaOilCan size={16} />,
  },
  {
    key: "kitchenware",
    dbValue: "បរិក្ខារផ្ទះបាយ",
    icon: <FaKitchenSet size={16} />,
  },
  {
    key: "coffee_tea",
    dbValue: "កាហ្វេ និងតែ",
    icon: <BiSolidCoffeeBean size={16} />,
  },
  {
    key: "nodble",
    dbValue: "មី​ និង​ គុយទាវ",
    icon: <GiNoodles size={16} />,
  },
  {
    key: "canned_food",
    dbValue: "អាហារកំប៉ុង",
    icon: <BiSolidBowlHot size={16} />,
  },
  {
    key: "essentials",
    dbValue: "ឧបករណ៍ចាំបាច់នានា",
    icon: <FaCalendarCheck size={16} />,
  },
  { key: "clothing", dbValue: "សម្លៀកបំពាក់", icon: <GiClothes size={16} /> },
  { key: "milk", dbValue: "ទឹកដោះគោ", icon: <PiCowFill size={16} /> },
  {
    key: "general_items",
    dbValue: "សម្ភារៈទូទៅ",
    icon: <FaDollyFlatbed size={16} />,
  },
];

export default function Hero({
  search,
  setSearch,
  activeCategory,
  setCategory,
}) {
  const [focused, setFocused] = useState(false);
  const { t } = useTranslation(); // 🏆 IMPORT TRANSLATION

  return (
    <div style={styles.heroWrapper}>
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
          <span>{t("hero.badge", "FRESH DAILY")}</span>
        </div>

        {/* Heading */}
        <h1 style={styles.heading}>
          {t("hero.welcome", "Welcome to")}{" "}
          <span style={{ color: "#2563EB" }}>SOPHEA MART</span>
        </h1>

        {/* Description */}
        <p style={styles.description}>
          {t(
            "hero.description",
            "Your local mart with cold drinks, daily groceries, delicious snacks, and baby essentials to fulfill your everyday needs.",
          )}
        </p>

        {/* Search Input */}
        <div style={styles.searchContainer}>
          <FiSearch size={20} style={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t(
              "hero.search_placeholder",
              "Search for drinks, snacks, baby needs...",
            )}
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
            // 🏆 Check against dbValue instead of name
            const active = activeCategory === cat.dbValue;

            return (
              <button
                key={cat.key}
                onClick={() => setCategory(active ? "All" : cat.dbValue)} // Send dbValue to Supabase Filter
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
                {/* 🏆 Ask translation file for the proper display name */}
                <span>{t(`categories.${cat.key}`)}</span>
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
