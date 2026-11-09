import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  FiCamera,
  FiCameraOff,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiPrinter,
  FiRefreshCw,
  FiDollarSign,
  FiSmartphone,
  FiShoppingBag,
  FiZap,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { supabase } from "../../services/supabase";
import { fmt, fmtKHR } from "../../utils/currency";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next";

const DEFAULT_EXCHANGE_RATE = 4100;
const SAME_BARCODE_COOLDOWN_MS = 1250;

// Crisp Web Audio API Cashier Beep (Zero external MP3 dependency or lag)
function playCashierBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = success ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(success ? 1350 : 280, ctx.currentTime);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (success ? 0.09 : 0.22),
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.09 : 0.22));
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch {
    // Ignore audio context restrictions
  }
}

export default function PosCashierTab({
  products = [],
  user,
  profile,
  onSaleCompleted,
  triggerToast,
}) {
  const { t } = useTranslation();

  // POS Cart & Search State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // "cash" | "bank"
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  // Cash Tendered State (Supports mixed USD + KHR handed by walk-in customer)
  const [tenderedUsd, setTenderedUsd] = useState("");
  const [tenderedKhr, setTenderedKhr] = useState("");

  // Continuous Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedBanner, setLastScannedBanner] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);

  const html5QrCodeRef = useRef(null);
  const lastScanRef = useRef({ code: "", time: 0 });
  const bannerTimerRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fast O(1) barcode lookup map + available products list
  const { barcodeMap, activeProducts } = useMemo(() => {
    const map = new Map();
    const active = [];

    (products || []).forEach((p) => {
      if (p.in_stock === false) return;
      active.push(p);

      const rawCodes = [p.barcode, p.code, p.sku, String(p.id)]
        .filter(Boolean)
        .map((c) => String(c).trim().toLowerCase());

      rawCodes.forEach((code) => {
        if (code) map.set(code, p);
      });
    });

    return { barcodeMap: map, activeProducts: active };
  }, [products]);

  // Filtered quick-select products for manual search or non-barcoded items
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeProducts.slice(0, 12);
    return activeProducts
      .filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          String(p.barcode || "")
            .toLowerCase()
            .includes(q) ||
          String(p.category || "")
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 16);
  }, [activeProducts, searchQuery]);

  const showScanFeedback = useCallback((text, isError = false) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setLastScannedBanner({ text, isError });
    bannerTimerRef.current = setTimeout(() => {
      setLastScannedBanner(null);
    }, 2200);
  }, []);

  // Add item to POS Bill
  const addItemToBill = useCallback(
    (product) => {
      if (!product) return;
      const unitPrice = Number(product.price ?? product.price_usd ?? 0);

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === product.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + 1,
          };
          return updated;
        }
        return [
          {
            id: product.id,
            name: product.name || "Product",
            price: unitPrice,
            image_url: product.image_url || product.image || "",
            barcode: product.barcode || "",
            qty: 1,
          },
          ...prev,
        ];
      });

      if (soundEnabledRef.current) playCashierBeep(true);
      try {
        if (navigator.vibrate) navigator.vibrate(45);
      } catch {
        // Ignore vibration permission
      }

      showScanFeedback(`+1 ${product.name} (${fmt(unitPrice)})`, false);
    },
    [showScanFeedback],
  );

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBill = () => {
    setCart([]);
    setTenderedUsd("");
    setTenderedKhr("");
    setCompletedReceipt(null);
    lastScanRef.current = { code: "", time: 0 };
  };

  // Keep latest barcode handler in ref so camera stream never needs to restart when cart updates
  const handleBarcodeDetectedRef = useRef(null);
  handleBarcodeDetectedRef.current = (decodedText) => {
    const cleanCode = String(decodedText || "").trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (
      lastScanRef.current.code === cleanCode &&
      now - lastScanRef.current.time < SAME_BARCODE_COOLDOWN_MS
    ) {
      return;
    }

    lastScanRef.current = { code: cleanCode, time: now };
    const matchedProduct = barcodeMap.get(cleanCode.toLowerCase());

    if (matchedProduct) {
      addItemToBill(matchedProduct);
    } else {
      if (soundEnabledRef.current) playCashierBeep(false);
      try {
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      } catch {
        // Ignore
      }
      showScanFeedback(`Barcode not found: ${cleanCode}`, true);
      setSearchQuery(cleanCode);
    }
  };

  // Stop camera cleanly
  const stopScanner = useCallback(async () => {
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {
        // Ignore stop errors
      }
      try {
        instance.clear();
      } catch {
        // Ignore clear errors
      }
    }
    setScannerOpen(false);
    setCameraStarting(false);
  }, []);

  // Start continuous back-camera scanner
  const startScanner = useCallback(async () => {
    if (cameraStarting || html5QrCodeRef.current) return;
    setScannerOpen(true);
    setCameraStarting(true);

    setTimeout(async () => {
      try {
        const readerElement = document.getElementById("pos-continuous-reader");
        if (!readerElement) {
          setCameraStarting(false);
          return;
        }

        const qr = new Html5Qrcode("pos-continuous-reader");
        html5QrCodeRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 250, height: 120 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            if (handleBarcodeDetectedRef.current) {
              handleBarcodeDetectedRef.current(decodedText);
            }
          },
          () => {
            // Ignore frame parse misses
          },
        );
      } catch (err) {
        console.error("POS Camera Error:", err);
        triggerToast?.(
          t(
            "pos.camera_error",
            "Could not access back camera. Please check camera permissions.",
          ),
          "error",
        );
        setScannerOpen(false);
        html5QrCodeRef.current = null;
      } finally {
        setCameraStarting(false);
      }
    }, 80);
  }, [cameraStarting, triggerToast, t]);

  // Cleanup camera & timers on unmount
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      stopScanner();
    };
  }, [stopScanner]);

  // Bill Totals & Dual-Currency Change Calculation
  const totals = useMemo(() => {
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    const totalUsd =
      Math.round(cart.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;
    const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 4100;
    const totalKhr = Math.round((totalUsd * rate) / 100) * 100;

    const givenUsd = parseFloat(tenderedUsd) || 0;
    const givenKhr = parseFloat(tenderedKhr) || 0;
    const totalGivenInUsd = givenUsd + givenKhr / rate;

    const changeUsdRaw = totalGivenInUsd - totalUsd;
    const changeUsd =
      changeUsdRaw > 0.004 ? Math.round(changeUsdRaw * 100) / 100 : 0;
    const changeKhr =
      changeUsdRaw > 0.004 ? Math.round((changeUsdRaw * rate) / 100) * 100 : 0;

    // Smart Mixed Change Breakdown: Whole USD notes + remainder in Riel
    const wholeUsdChange = Math.floor(changeUsd + 0.001);
    const remainderKhrChange =
      Math.round(((changeUsd - wholeUsdChange) * rate) / 100) * 100;

    return {
      totalItems,
      totalUsd,
      totalKhr,
      totalGivenInUsd,
      changeUsd,
      changeKhr,
      wholeUsdChange,
      remainderKhrChange,
      isEnoughCash:
        paymentMethod === "bank" ||
        (givenUsd === 0 && givenKhr === 0) ||
        totalGivenInUsd + 0.005 >= totalUsd,
    };
  }, [cart, exchangeRate, tenderedUsd, tenderedKhr, paymentMethod]);

  // Handle Enter key in search box to immediately add exact barcode match
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;

      const exactMatch = barcodeMap.get(q);
      if (exactMatch) {
        addItemToBill(exactMatch);
        setSearchQuery("");
      } else if (filteredProducts.length === 1) {
        addItemToBill(filteredProducts[0]);
        setSearchQuery("");
      }
    }
  };

  // Complete Walk-In POS Sale -> Saves to Supabase Orders & order_items
  const handleCompleteSale = async () => {
    if (cart.length === 0 || isCompleting) return;
    if (!totals.isEnoughCash) {
      triggerToast?.(
        t(
          "pos.insufficient_cash",
          "Cash received is less than the bill total!",
        ),
        "error",
      );
      return;
    }

    setIsCompleting(true);
    const orderId = `POS-${Date.now().toString().slice(-6)}`;
    const cashierName =
      profile?.full_name || user?.email?.split("@")[0] || "Cashier";

    try {
      // 1. Insert completed Walk-In POS Order into Orders table
      const orderPayload = {
        id: orderId,
        user_id: user?.id || null,
        customer_name: `Walk-in (${cashierName})`,
        payment_method: paymentMethod,
        total_items: totals.totalItems,
        total_usd: totals.totalUsd,
        status: "completed",
      };

      const { error: orderErr } = await supabase
        .from("Orders")
        .insert([orderPayload]);

      if (orderErr) {
        // Fallback minimal payload in case customer_name column doesn't exist in Orders schema
        const { error: fallbackErr } = await supabase.from("Orders").insert([
          {
            id: orderId,
            user_id: user?.id || null,
            payment_method: paymentMethod,
            total_items: totals.totalItems,
            total_usd: totals.totalUsd,
            status: "completed",
          },
        ]);
        if (fallbackErr) throw fallbackErr;
      }

      // 2. Insert line items into order_items so Top Selling Items & OrderDetailsModal work seamlessly
      const orderItemsPayload = cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        price: item.price,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsErr) {
        console.warn("Note inserting POS order_items:", itemsErr.message);
      }

      if (soundEnabledRef.current) playCashierBeep(true);

      // Save receipt snapshot for instant display/printing
      setCompletedReceipt({
        id: orderId,
        date: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Phnom_Penh",
        }),
        cashier: cashierName,
        items: [...cart],
        paymentMethod,
        totalUsd: totals.totalUsd,
        totalKhr: totals.totalKhr,
        givenUsd: parseFloat(tenderedUsd) || 0,
        givenKhr: parseFloat(tenderedKhr) || 0,
        changeUsd: totals.changeUsd,
        changeKhr: totals.changeKhr,
        wholeUsdChange: totals.wholeUsdChange,
        remainderKhrChange: totals.remainderKhrChange,
      });

      setCart([]);
      setTenderedUsd("");
      setTenderedKhr("");
      triggerToast?.(
        `✅ POS Sale ${orderId} completed (${fmt(totals.totalUsd)})!`,
        "success",
      );
      onSaleCompleted?.();
    } catch (err) {
      console.error("POS Checkout Error:", err);
      triggerToast?.(
        `Failed to record POS sale: ${err.message || "Database error"}`,
        "error",
      );
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <style>
        {`
          .pos-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 20px;
            align-items: start;
          }
          .pos-product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
            gap: 10px;
          }
          @media (max-width: 900px) {
            .pos-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media print {
            body * { visibility: hidden; }
            #pos-printable-receipt, #pos-printable-receipt * {
              visibility: visible;
            }
            #pos-printable-receipt {
              position: fixed;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 10px;
              background: #fff;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      {/* Top Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          background: "#fff",
          padding: "14px 18px",
          borderRadius: 16,
          border: "1px solid #f3f4f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#EFF6FF",
              color: "#0066FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiZap size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
              {t("pos.title", "Fast POS Counter Scanner")}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
              {t(
                "pos.subtitle",
                "Scan multiple items continuously by phone or tap items below",
              )}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Editable Exchange Rate Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F9FAFB",
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>1$ =</span>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              style={{
                width: 64,
                border: "none",
                background: "transparent",
                fontWeight: 700,
                color: "#0066FF",
                fontSize: 13,
                outline: "none",
              }}
            />
            <span>៛</span>
          </div>

          {/* Beep Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: soundEnabled ? "#ECFDF5" : "#F3F4F6",
              color: soundEnabled ? "#059669" : "#6B7280",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {soundEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
            {soundEnabled ? "Beep ON" : "Muted"}
          </button>

          {/* Toggle Continuous Camera Button */}
          <button
            type="button"
            onClick={scannerOpen ? stopScanner : startScanner}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: scannerOpen ? "#EF4444" : "#0066FF",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(0, 102, 255, 0.2)",
            }}
          >
            {scannerOpen ? (
              <>
                <FiCameraOff size={18} />{" "}
                {t("pos.stop_camera", "Close Camera")}
              </>
            ) : (
              <>
                <FiCamera size={18} />{" "}
                {t("pos.start_camera", "Scan with Phone Camera")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pos-grid">
        {/* LEFT COLUMN: Continuous Camera + Instant Product Lookup */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Continuous Phone Camera Viewfinder */}
          {scannerOpen && (
            <div
              onClick={() => {
                // Tap camera viewfinder to immediately allow re-scanning the same barcode
                lastScanRef.current = { code: "", time: 0 };
                showScanFeedback(
                  "Ready! Hold barcode in front of camera",
                  false,
                );
              }}
              style={{
                background: "#111827",
                borderRadius: 18,
                overflow: "hidden",
                position: "relative",
                border: "2px solid #0066FF",
                cursor: "pointer",
              }}
            >
              <div
                id="pos-continuous-reader"
                style={{ width: "100%", minHeight: 220 }}
              />

              {cameraStarting && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(17,24,39,0.8)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Starting continuous back-camera scanner...
                </div>
              )}

              {/* Floating Live Scan Feedback Banner */}
              {lastScannedBanner && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: lastScannedBanner.isError
                      ? "rgba(220, 38, 38, 0.95)"
                      : "rgba(16, 185, 129, 0.95)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                    zIndex: 10,
                  }}
                >
                  {lastScannedBanner.text}
                </div>
              )}

              <div
                style={{
                  background: "#1F2937",
                  color: "#D1D5DB",
                  padding: "8px 14px",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>🟢 Continuous Scan Mode (Camera stays open)</span>
                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                  Tap camera to scan same item again
                </span>
              </div>
            </div>
          )}

          {/* Search / Barcode Input + Quick Tap Product Grid */}
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #f3f4f6",
            }}
          >
            <div style={{ position: "relative", marginBottom: 16 }}>
              <FiSearch
                size={18}
                color="#9CA3AF"
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t(
                  "pos.search_placeholder",
                  "Type product name or scan/type barcode + press Enter...",
                )}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#F9FAFB",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "#E5E7EB",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="pos-product-grid">
              {filteredProducts.map((product) => {
                const price = Number(product.price ?? product.price_usd ?? 0);
                const inBill = cart.find((c) => c.id === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItemToBill(product)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 14,
                      border: inBill
                        ? "2px solid #0066FF"
                        : "1px solid #F3F4F6",
                      background: inBill ? "#EFF6FF" : "#fff",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {inBill && (
                      <span
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "#0066FF",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ×{inBill.qty}
                      </span>
                    )}
                    {product.image_url || product.image ? (
                      <img
                        src={product.image_url || product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: 76,
                          objectFit: "contain",
                          borderRadius: 8,
                          background: "#F9FAFB",
                          marginBottom: 8,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 76,
                          borderRadius: 8,
                          background: "#F3F4F6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 8,
                          color: "#9CA3AF",
                        }}
                      >
                        <FiShoppingBag size={22} />
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                        width: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0066FF",
                        marginTop: 2,
                      }}
                    >
                      {fmt(price)}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      {fmtKHR(price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Cashier Bill & Dual-Currency Change Calculator */}
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 20,
            border: "1px solid #f3f4f6",
            position: "sticky",
            top: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 14,
              borderBottom: "1px solid #F3F4F6",
              marginBottom: 14,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: "#111827" }}>
                🧾 {t("pos.current_bill", "Current Counter Bill")}
              </h3>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                {totals.totalItems} {t("store.items", "items")}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearBill}
                style={{
                  border: "none",
                  background: "#FEE2E2",
                  color: "#DC2626",
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FiTrash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Scanned Items List */}
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {cart.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "#9CA3AF",
                  background: "#F9FAFB",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              >
                Scan a product barcode with your phone camera or tap an item on
                the left to start a bill.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px",
                    background: "#F9FAFB",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#111827",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {fmt(item.price)} × {item.qty} ={" "}
                      <strong style={{ color: "#0066FF" }}>
                        {fmt(item.price * item.qty)}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "1px solid #D1D5DB",
                        background: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FiMinus size={13} />
                    </button>
                    <span
                      style={{
                        minWidth: 22,
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "none",
                        background: "#0066FF",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FiPlus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: "#EF4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dual-Currency Grand Total Box */}
          <div
            style={{
              background: "#EFF6FF",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 16,
              border: "1px solid #BFDBFE",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF" }}
              >
                TOTAL DUE (USD)
              </span>
              <span
                style={{ fontSize: 26, fontWeight: 800, color: "#0066FF" }}
              >
                {fmt(totals.totalUsd)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 4,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 600, color: "#1E40AF" }}
              >
                សរុបជាប្រាក់រៀល (KHR)
              </span>
              <span
                style={{ fontSize: 18, fontWeight: 800, color: "#1D4ED8" }}
              >
                {totals.totalKhr.toLocaleString()} ៛
              </span>
            </div>
          </div>

          {/* Payment Method Toggle (Cash vs KHQR) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              style={{
                padding: "10px",
                borderRadius: 10,
                border:
                  paymentMethod === "cash"
                    ? "2px solid #0066FF"
                    : "1px solid #E5E7EB",
                background: paymentMethod === "cash" ? "#EFF6FF" : "#fff",
                color: paymentMethod === "cash" ? "#0066FF" : "#374151",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <FiDollarSign size={16} /> 💵 Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              style={{
                padding: "10px",
                borderRadius: 10,
                border:
                  paymentMethod === "bank"
                    ? "2px solid #0066FF"
                    : "1px solid #E5E7EB",
                background: paymentMethod === "bank" ? "#EFF6FF" : "#fff",
                color: paymentMethod === "bank" ? "#0066FF" : "#374151",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <FiSmartphone size={16} /> 📱 ABA KHQR
            </button>
          </div>

          {/* Cash Calculator (USD + KHR Received & Change Due) */}
          {paymentMethod === "cash" && cart.length > 0 && (
            <div
              style={{
                background: "#F9FAFB",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #E5E7EB",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Cash Received from Customer (Optional Quick Calculator):
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: 600,
                    }}
                  >
                    Received USD ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={tenderedUsd}
                    onChange={(e) => setTenderedUsd(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #D1D5DB",
                      fontSize: 14,
                      fontWeight: 700,
                      boxSizing: "border-box",
                      marginTop: 4,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: 600,
                    }}
                  >
                    Received Riel (៛)
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="0"
                    value={tenderedKhr}
                    onChange={(e) => setTenderedKhr(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #D1D5DB",
                      fontSize: 14,
                      fontWeight: 700,
                      boxSizing: "border-box",
                      marginTop: 4,
                    }}
                  />
                </div>
              </div>

              {/* 1-Tap Banknote Shortcuts */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {[
                  {
                    label: "Exact",
                    onClick: () => {
                      setTenderedUsd(String(totals.totalUsd));
                      setTenderedKhr("");
                    },
                  },
                  {
                    label: "$5",
                    onClick: () =>
                      setTenderedUsd((prev) =>
                        String((parseFloat(prev) || 0) + 5),
                      ),
                  },
                  {
                    label: "$10",
                    onClick: () =>
                      setTenderedUsd((prev) =>
                        String((parseFloat(prev) || 0) + 10),
                      ),
                  },
                  {
                    label: "$20",
                    onClick: () =>
                      setTenderedUsd((prev) =>
                        String((parseFloat(prev) || 0) + 20),
                      ),
                  },
                  {
                    label: "10,000៛",
                    onClick: () =>
                      setTenderedKhr((prev) =>
                        String((parseFloat(prev) || 0) + 10000),
                      ),
                  },
                  {
                    label: "20,000៛",
                    onClick: () =>
                      setTenderedKhr((prev) =>
                        String((parseFloat(prev) || 0) + 20000),
                      ),
                  },
                  {
                    label: "50,000៛",
                    onClick: () =>
                      setTenderedKhr((prev) =>
                        String((parseFloat(prev) || 0) + 50000),
                      ),
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.onClick}
                    style={{
                      padding: "5px 9px",
                      borderRadius: 8,
                      border: "1px solid #D1D5DB",
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "#111827",
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Change Due Display */}
              {(parseFloat(tenderedUsd) > 0 || parseFloat(tenderedKhr) > 0) && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: totals.isEnoughCash ? "#ECFDF5" : "#FEF2F2",
                    border: `1px solid ${
                      totals.isEnoughCash ? "#A7F3D0" : "#FECACA"
                    }`,
                  }}
                >
                  {totals.isEnoughCash ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 800,
                          color: "#065F46",
                          fontSize: 15,
                        }}
                      >
                        <span>CHANGE DUE:</span>
                        <span>
                          {fmt(totals.changeUsd)} ({totals.changeKhr.toLocaleString()} ៛)
                        </span>
                      </div>
                      {totals.wholeUsdChange > 0 &&
                        totals.remainderKhrChange > 0 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#047857",
                              marginTop: 4,
                              fontWeight: 600,
                            }}
                          >
                            💡 Give customer:{" "}
                            <strong>${totals.wholeUsdChange} USD</strong> +{" "}
                            <strong>
                              {totals.remainderKhrChange.toLocaleString()} ៛
                            </strong>
                          </div>
                        )}
                    </>
                  ) : (
                    <div
                      style={{
                        color: "#DC2626",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Still short by{" "}
                      {fmt(totals.totalUsd - totals.totalGivenInUsd)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Complete Sale Button */}
          <Button
            full
            disabled={
              cart.length === 0 || isCompleting || !totals.isEnoughCash
            }
            onClick={handleCompleteSale}
            style={{
              padding: "14px",
              fontSize: 16,
              fontWeight: 800,
              borderRadius: 12,
              background: cart.length === 0 ? "#9CA3AF" : "#10B981",
            }}
          >
            {isCompleting
              ? "Recording Sale..."
              : `✅ Complete Sale (${fmt(totals.totalUsd)})`}
          </Button>
        </div>
      </div>

      {/* Instant Printable Walk-In Receipt Modal */}
      {completedReceipt && (
        <div
          onClick={() => setCompletedReceipt(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            id="pos-printable-receipt"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 380,
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <FiCheckCircle size={36} color="#10B981" />
              <h3 style={{ margin: "8px 0 2px", fontSize: 19 }}>
                SOPHEA MART
              </h3>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Receipt #{completedReceipt.id} • {completedReceipt.date}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Cashier: {completedReceipt.cashier}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px dashed #D1D5DB",
                borderBottom: "1px dashed #D1D5DB",
                padding: "12px 0",
                marginBottom: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {completedReceipt.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <strong>{fmt(item.price * item.qty)}</strong>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 14, marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                <span>Total USD:</span>
                <span>{fmt(completedReceipt.totalUsd)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  color: "#4B5563",
                  marginTop: 2,
                }}
              >
                <span>Total KHR:</span>
                <span>{completedReceipt.totalKhr.toLocaleString()} ៛</span>
              </div>
              {completedReceipt.changeUsd > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    color: "#059669",
                    marginTop: 6,
                  }}
                >
                  <span>Change Due:</span>
                  <span>
                    {fmt(completedReceipt.changeUsd)} (
                    {completedReceipt.changeKhr.toLocaleString()} ៛)
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  background: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <FiPrinter size={16} /> Print
              </button>
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                style={{
                  flex: 1.4,
                  padding: "11px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0066FF",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <FiRefreshCw size={16} /> Next Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
