import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
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
  FiX,
  FiArrowDown,
  FiArrowRight,
  FiTag,
  FiChevronDown,
} from "react-icons/fi";
import { supabase } from "../../services/supabase";
import { fmt } from "../../utils/currency";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next";

const DEFAULT_RATE = 4000;
const MIN_RATE = 1000;
const MAX_RATE = 10000;
const MAX_QTY = 999;
const MAX_CASH_USD = 100000;
const MAX_CASH_KHR = 400000000;
const SCAN_COOLDOWN_MS = 1200;
const PAGE_SIZE = 36;

// 🔊 Web Audio API Supermarket Laser Beep
let sharedAudioCtx = null;
function playScannerSound(type = "scan") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();

    const now = sharedAudioCtx.currentTime;
    if (type === "scan") {
      const o1 = sharedAudioCtx.createOscillator();
      const o2 = sharedAudioCtx.createOscillator();
      const g = sharedAudioCtx.createGain();
      const g2 = sharedAudioCtx.createGain();

      o1.type = "triangle";
      o2.type = "square";
      o1.frequency.setValueAtTime(2650, now);
      o2.frequency.setValueAtTime(5300, now);
      g2.gain.setValueAtTime(0.18, now);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.005);
      g.gain.setValueAtTime(0.32, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);

      o1.connect(g);
      o2.connect(g2);
      g2.connect(g);
      g.connect(sharedAudioCtx.destination);
      o1.start(now);
      o2.start(now);
      o1.stop(now + 0.075);
      o2.stop(now + 0.075);
    } else if (type === "complete") {
      [2100, 2800].forEach((freq, i) => {
        const o = sharedAudioCtx.createOscillator();
        const g = sharedAudioCtx.createGain();
        const s = now + i * 0.085;
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, s);
        g.gain.setValueAtTime(0.28, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.075);
        o.connect(g);
        g.connect(sharedAudioCtx.destination);
        o.start(s);
        o.stop(s + 0.08);
      });
    } else {
      [0, 0.12].forEach((offset) => {
        const o = sharedAudioCtx.createOscillator();
        const g = sharedAudioCtx.createGain();
        const s = now + offset;
        o.type = "sawtooth";
        o.frequency.setValueAtTime(240, s);
        g.gain.setValueAtTime(0.22, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.09);
        o.connect(g);
        g.connect(sharedAudioCtx.destination);
        o.start(s);
        o.stop(s + 0.095);
      });
    }
  } catch {
    // Ignore audio context restrictions
  }
}

function releaseCameraHardware() {
  try {
    const el = document.getElementById("pos-continuous-reader");
    if (!el) return;
    el.querySelectorAll("video").forEach((v) => {
      v.srcObject?.getTracks?.().forEach((t) => t.stop());
      v.srcObject = null;
    });
  } catch {
    // Ignore cleanup errors
  }
}

// Collision-resistant POS Order ID
function createPosOrderId() {
  const timePart = Date.now().toString().slice(-5);
  const randPart = Math.floor(10 + Math.random() * 90);
  return `POS-${timePart}${randPart}`;
}

const PosProductCard = memo(function PosProductCard({
  product,
  qtyInBill,
  safeRate,
  onSelect,
}) {
  const price = Math.max(0, Number(product.price ?? product.price_usd ?? 0));
  const khr = Math.round((price * safeRate) / 100) * 100;
  const imgSrc = product.image_url || product.image;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`pos-product-card ${qtyInBill > 0 ? "active" : ""}`}
    >
      {qtyInBill > 0 && <span className="pos-card-badge">×{qtyInBill}</span>}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="pos-card-img"
        />
      ) : (
        <div className="pos-card-placeholder">
          <FiShoppingBag size={20} />
        </div>
      )}
      <div className="pos-card-title">{product.name}</div>
      <div className="pos-card-usd">{fmt(price)}</div>
      <div className="pos-card-khr">{khr.toLocaleString()} ៛</div>
    </button>
  );
});

export default function PosCashierTab({
  products = [],
  user,
  profile,
  onSaleCompleted,
  triggerToast,
}) {
  const { t, i18n } = useTranslation();
  const isKm = (i18n.language || "").toLowerCase().startsWith("km");
  const isStaff = profile?.role === "admin" || profile?.role === "cashier";

  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [scrollDirection, setScrollDirection] = useState("vertical");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_RATE);
  const [tenderedUsd, setTenderedUsd] = useState("");
  const [tenderedKhr, setTenderedKhr] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedBanner, setLastScannedBanner] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [isBillVisible, setIsBillVisible] = useState(false);

  const html5QrCodeRef = useRef(null);
  const lastScanRef = useRef({ code: "", time: 0 });
  const bannerTimerRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  const billSectionRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const el = billSectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsBillVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Clamped exchange rate for safe currency math
  const safeRate = useMemo(() => {
    const n = Number(exchangeRate);
    if (!Number.isFinite(n) || n < MIN_RATE) return DEFAULT_RATE;
    return Math.min(MAX_RATE, Math.round(n));
  }, [exchangeRate]);

  // O(1) barcode map & active catalog
  const { barcodeMap, activeProducts, categories, noBarcodeCount } =
    useMemo(() => {
      const map = new Map();
      const active = [];
      const catSet = new Set();
      let missing = 0;

      (products || []).forEach((p) => {
        if (!p || p.in_stock === false) return;
        active.push(p);

        const cat = String(p.category || "").trim();
        if (cat) catSet.add(cat);

        const codes = [p.barcode, p.code, p.sku]
          .filter(Boolean)
          .map((c) => String(c).trim().toLowerCase());

        if (codes.length === 0) missing += 1;
        [...codes, String(p.id).toLowerCase()].forEach((c) => {
          if (c) map.set(c, p);
        });
      });

      return {
        barcodeMap: map,
        activeProducts: active,
        categories: Array.from(catSet),
        noBarcodeCount: missing,
      };
    }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (selectedCategory === "__no_barcode__") {
        if (p.barcode || p.code || p.sku) return false;
      } else if (
        selectedCategory !== "all" &&
        String(p.category || "").trim() !== selectedCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        String(p.barcode || "")
          .toLowerCase()
          .includes(q) ||
        String(p.category || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [activeProducts, searchQuery, selectedCategory]);

  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, visibleLimit),
    [filteredProducts, visibleLimit],
  );

  const cartQtyMap = useMemo(() => {
    const map = new Map();
    cart.forEach((i) => map.set(i.id, i.qty));
    return map;
  }, [cart]);

  const showScanFeedback = useCallback((text, isError = false) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setLastScannedBanner({ text, isError });
    bannerTimerRef.current = setTimeout(() => setLastScannedBanner(null), 2000);
  }, []);

  const addItemToBill = useCallback(
    (product) => {
      if (!product?.id) return;
      const unitPrice = Math.max(
        0,
        Number(product.price ?? product.price_usd ?? 0),
      );

      setCart((prev) => {
        const idx = prev.findIndex((i) => i.id === product.id);
        if (idx > -1) {
          if (prev[idx].qty >= MAX_QTY) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
        return [
          {
            id: product.id,
            name: String(product.name || "Product").slice(0, 120),
            price: unitPrice,
            qty: 1,
          },
          ...prev,
        ];
      });

      if (soundEnabledRef.current) playScannerSound("scan");
      try {
        navigator.vibrate?.(35);
      } catch {
        // Ignore
      }
      showScanFeedback(`+1 ${product.name} (${fmt(unitPrice)})`, false);
    },
    [showScanFeedback],
  );

  const updateQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.min(MAX_QTY, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearBill = useCallback(() => {
    setCart([]);
    setTenderedUsd("");
    setTenderedKhr("");
    setCompletedReceipt(null);
    lastScanRef.current = { code: "", time: 0 };
  }, []);

  const handleBarcodeDetectedRef = useRef(null);
  handleBarcodeDetectedRef.current = (rawText) => {
    const cleanCode = String(rawText || "")
      .trim()
      .slice(0, 64);
    if (!cleanCode) return;

    const now = Date.now();
    if (
      lastScanRef.current.code === cleanCode &&
      now - lastScanRef.current.time < SCAN_COOLDOWN_MS
    ) {
      return;
    }

    lastScanRef.current = { code: cleanCode, time: now };
    const match = barcodeMap.get(cleanCode.toLowerCase());

    if (match) {
      addItemToBill(match);
    } else {
      if (soundEnabledRef.current) playScannerSound("error");
      try {
        navigator.vibrate?.([80, 50, 80]);
      } catch {
        // Ignore
      }
      showScanFeedback(
        `${t("pos.barcode_not_found", "Barcode not found")}: ${cleanCode}`,
        true,
      );
      setSelectedCategory("all");
      setSearchQuery(cleanCode);
    }
  };

  const stopScanner = useCallback(async () => {
    const instance = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    if (instance) {
      try {
        if (instance.isScanning) await instance.stop();
      } catch {
        // Ignore
      }
      try {
        instance.clear();
      } catch {
        // Ignore
      }
    }
    releaseCameraHardware();
    setScannerOpen(false);
    setCameraStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (cameraStarting || html5QrCodeRef.current) return;
    setScannerOpen(true);
    setCameraStarting(true);

    setTimeout(async () => {
      try {
        if (!document.getElementById("pos-continuous-reader")) {
          setCameraStarting(false);
          return;
        }
        const qr = new Html5Qrcode("pos-continuous-reader");
        html5QrCodeRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          { fps: 18, qrbox: { width: 240, height: 115 }, aspectRatio: 1.777 },
          (decoded) => handleBarcodeDetectedRef.current?.(decoded),
          () => {},
        );
      } catch {
        releaseCameraHardware();
        triggerToast?.(
          t(
            "pos.camera_error",
            "Could not access back camera. Please check permissions.",
          ),
          "error",
        );
        setScannerOpen(false);
        html5QrCodeRef.current = null;
      } finally {
        setCameraStarting(false);
      }
    }, 60);
  }, [cameraStarting, triggerToast, t]);

  // Hardware USB/Bluetooth scanner listener
  useEffect(() => {
    let buf = "";
    let lastTime = 0;

    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      if (now - lastTime > 80) buf = "";
      lastTime = now;

      if (e.key === "Enter" && buf.length >= 4) {
        e.preventDefault();
        const code = buf.trim();
        buf = "";
        handleBarcodeDetectedRef.current?.(code);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf = (buf + e.key).slice(0, 64);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      stopScanner();
    };
  }, [stopScanner]);

  // Sanitized cash input handlers
  const handleUsdInput = (val) => {
    if (val === "") return setTenderedUsd("");
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0) return;
    if (num <= MAX_CASH_USD) setTenderedUsd(val);
  };

  const handleKhrInput = (val) => {
    if (val === "") return setTenderedKhr("");
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0) return;
    if (num <= MAX_CASH_KHR) setTenderedKhr(val);
  };

  const totals = useMemo(() => {
    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    const totalUsd =
      Math.round(cart.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    const totalKhr = Math.round((totalUsd * safeRate) / 100) * 100;

    const givenUsd = Math.max(0, parseFloat(tenderedUsd) || 0);
    const givenKhr = Math.max(0, parseFloat(tenderedKhr) || 0);
    const totalGivenInUsd = givenUsd + givenKhr / safeRate;

    const diff = totalGivenInUsd - totalUsd;
    const changeUsd = diff > 0.004 ? Math.round(diff * 100) / 100 : 0;
    const changeKhr =
      diff > 0.004 ? Math.round((diff * safeRate) / 100) * 100 : 0;

    const wholeUsdChange = Math.floor(changeUsd + 0.001);
    const remainderKhrChange =
      Math.round(((changeUsd - wholeUsdChange) * safeRate) / 100) * 100;

    return {
      totalItems,
      totalUsd,
      totalKhr,
      givenUsd,
      givenKhr,
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
  }, [cart, safeRate, tenderedUsd, tenderedKhr, paymentMethod]);

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const exact = barcodeMap.get(q);
    if (exact) {
      addItemToBill(exact);
      setSearchQuery("");
    } else if (filteredProducts.length === 1) {
      addItemToBill(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  const handleCompleteSale = async () => {
    if (
      !isStaff ||
      cart.length === 0 ||
      isCompleting ||
      submittingRef.current
    ) {
      return;
    }

    if (!totals.isEnoughCash) {
      triggerToast?.(
        t(
          "pos.insufficient_cash",
          isKm
            ? "ប្រាក់ទទួលតិចជាងទឹកប្រាក់សរុប!"
            : "Cash received is less than the bill total!",
        ),
        "error",
      );
      return;
    }

    submittingRef.current = true;
    setIsCompleting(true);

    const orderId = createPosOrderId();
    const nowIso = new Date().toISOString();
    const safePayment = paymentMethod === "bank" ? "bank" : "cash";
    const cashierName =
      profile?.full_name || user?.email?.split("@")[0] || "Cashier";

    try {
      const orderPayload = {
        id: orderId,
        user_id: user?.id || null,
        payment_method: safePayment,
        total_items: totals.totalItems,
        total_usd: totals.totalUsd,
        status: "completed",
      };

      const { error: orderErr } = await supabase
        .from("Orders")
        .insert([orderPayload]);
      if (orderErr) throw orderErr;

      const orderItemsPayload = cart.map((i) => ({
        order_id: orderId,
        product_id: i.id,
        product_name: i.name,
        quantity: i.qty,
        price: i.price,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);
      if (itemsErr) console.warn("POS order_items warning:", itemsErr.message);

      if (soundEnabledRef.current) playScannerSound("complete");

      setCompletedReceipt({
        id: orderId,
        date: new Date().toLocaleString(isKm ? "km-KH" : "en-US", {
          timeZone: "Asia/Phnom_Penh",
        }),
        cashier: cashierName,
        items: [...cart],
        totalUsd: totals.totalUsd,
        totalKhr: totals.totalKhr,
        changeUsd: totals.changeUsd,
        changeKhr: totals.changeKhr,
      });

      setCart([]);
      setTenderedUsd("");
      setTenderedKhr("");
      triggerToast?.(`✅ ${orderId} (${fmt(totals.totalUsd)})`, "success");
      onSaleCompleted?.(
        { ...orderPayload, created_at: nowIso },
        orderItemsPayload,
      );
    } catch (err) {
      console.error("POS Checkout Error:", err);
      triggerToast?.(
        `Failed to record POS sale: ${err.message || "Database error"}`,
        "error",
      );
    } finally {
      submittingRef.current = false;
      setIsCompleting(false);
    }
  };

  return (
    <div className="pos-wrapper">
      <style>
        {`
          .pos-wrapper, .pos-wrapper * { box-sizing: border-box; }
          .pos-wrapper { width: 100%; max-width: 100%; overflow-x: hidden; }
          .pos-no-spin::-webkit-outer-spin-button,
          .pos-no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .pos-no-spin { -moz-appearance: textfield; }

          .pos-toolbar {
            display: flex; justify-content: space-between; align-items: center;
            flex-wrap: wrap; gap: 12px; margin-bottom: 16px; background: #fff;
            padding: 14px 16px; border-radius: 16px; border: 1px solid #F3F4F6;
          }
          .pos-toolbar-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
          .pos-grid {
            display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
            gap: 18px; align-items: start; width: 100%;
          }
          .pos-col { min-width: 0; width: 100%; max-width: 100%; }
          .pos-panel {
            background: #fff; border-radius: 16px; padding: 16px;
            border: 1px solid #F3F4F6; width: 100%; min-width: 0; overflow: hidden;
          }
          .pos-category-chips {
            display: flex; gap: 8px; width: 100%; overflow-x: auto;
            padding-bottom: 6px; margin-bottom: 12px; scrollbar-width: none;
          }
          .pos-category-chips::-webkit-scrollbar { display: none; }
          .pos-chip {
            padding: 6px 12px; border-radius: 999px; border: none;
            background: #F3F4F6; color: #374151; font-size: 12px;
            font-weight: 700; cursor: pointer; flex-shrink: 0;
            display: flex; align-items: center; gap: 4px;
          }
          .pos-chip.active { background: #0066FF; color: #fff; }
          .pos-chip.warn { background: #FEF3C7; color: #B45309; }
          .pos-chip.warn.active { background: #F59E0B; color: #fff; }

          .pos-product-grid-vertical {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
            gap: 10px; max-height: 520px; overflow-y: auto; padding-right: 2px;
          }
          .pos-product-grid-horizontal {
            display: grid; grid-template-rows: repeat(2, auto); grid-auto-flow: column;
            grid-auto-columns: 136px; gap: 10px; overflow-x: auto;
            padding-bottom: 10px; scroll-snap-type: x mandatory;
          }
          .pos-product-grid-horizontal > button { scroll-snap-align: start; }

          .pos-product-card {
            display: flex; flex-direction: column; align-items: flex-start;
            text-align: left; padding: 10px; border-radius: 14px;
            border: 1px solid #E5E7EB; background: #fff; cursor: pointer;
            position: relative; width: 100%; min-width: 0; overflow: hidden;
            transition: transform 0.1s ease; content-visibility: auto; contain-intrinsic-size: 145px;
          }
          .pos-product-card.active { border: 2px solid #0066FF; background: #EFF6FF; }
          .pos-product-card:active { transform: scale(0.97); }
          .pos-card-badge {
            position: absolute; top: 6px; right: 6px; background: #0066FF; color: #fff;
            border-radius: 999px; padding: 2px 7px; font-size: 11px; font-weight: 800; z-index: 2;
          }
          .pos-card-img {
            width: 100%; height: 72px; object-fit: contain; border-radius: 8px;
            background: #F9FAFB; margin-bottom: 8px;
          }
          .pos-card-placeholder {
            width: 100%; height: 72px; border-radius: 8px; background: #F3F4F6;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 8px; color: #9CA3AF;
          }
          .pos-card-title {
            font-size: 12.5px; font-weight: 600; color: #111827; width: 100%;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .pos-card-usd { font-size: 13px; font-weight: 800; color: #0066FF; margin-top: 2px; }
          .pos-card-khr { font-size: 11px; color: #6B7280; }

          .pos-qty-btn {
            width: 26px; height: 26px; border-radius: 7px; border: 1px solid #D1D5DB;
            background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
          }
          .pos-qty-btn.plus { border: none; background: #0066FF; color: #fff; }

          .pos-banknote-grid {
            display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px; margin-bottom: 8px; width: 100%;
          }
          .pos-note-btn {
            padding: 6px 2px; border-radius: 7px; font-size: 11px;
            font-weight: 800; cursor: pointer;
          }
          @media (min-width: 480px) {
            .pos-banknote-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
          }

          .pos-mobile-jump-bar { display: none; }
          @media (max-width: 960px) {
            .pos-grid { grid-template-columns: minmax(0, 1fr) !important; }
            .pos-product-grid-vertical {
              grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
              max-height: 420px;
            }
            .pos-mobile-jump-bar {
              display: flex; position: fixed; bottom: 12px; left: 12px; right: 12px;
              background: #111827; color: #fff; padding: 12px 16px; border-radius: 14px;
              justify-content: space-between; align-items: center; z-index: 900;
              box-shadow: 0 10px 25px rgba(0,0,0,0.25); cursor: pointer;
            }
          }

          @media print {
            body * { visibility: hidden; }
            #pos-printable-receipt, #pos-printable-receipt * { visibility: visible; }
            #pos-printable-receipt {
              position: fixed; left: 0; top: 0; width: 80mm; padding: 10px;
              background: #fff; box-shadow: none !important;
            }
          }
        `}
      </style>

      {/* Top Action Bar */}
      <div className="pos-toolbar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
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
              flexShrink: 0,
            }}
          >
            <FiZap size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#111827",
                lineHeight: 1.3,
              }}
            >
              {t("pos.title", "Fast POS Counter Scanner")}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
                lineHeight: 1.3,
              }}
            >
              {t(
                "pos.subtitle",
                "Scan barcodes continuously by phone or tap products below",
              )}
            </p>
          </div>
        </div>

        <div className="pos-toolbar-controls">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F9FAFB",
              padding: "5px 10px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>{t("pos.rate_label", "Rate")}:</span>
            <input
              type="number"
              min={MIN_RATE}
              max={MAX_RATE}
              step="50"
              className="pos-no-spin"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              onBlur={() => setExchangeRate(safeRate)}
              style={{
                width: 50,
                border: "1px solid #DBEAFE",
                borderRadius: 6,
                padding: "2px 4px",
                background: "#fff",
                fontWeight: 800,
                color: "#0066FF",
                fontSize: 12,
                outline: "none",
                textAlign: "center",
              }}
            />
            <span>៛</span>
            {[4000, 4100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setExchangeRate(preset)}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: safeRate === preset ? "#0066FF" : "#E5E7EB",
                  color: safeRate === preset ? "#fff" : "#374151",
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playScannerSound("scan");
              }}
              style={{
                padding: "8px 10px",
                borderRadius: "10px 0 0 10px",
                border: "1px solid #E5E7EB",
                background: soundEnabled ? "#ECFDF5" : "#F3F4F6",
                color: soundEnabled ? "#059669" : "#6B7280",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {soundEnabled ? <FiVolume2 size={15} /> : <FiVolumeX size={15} />}
              {soundEnabled
                ? t("pos.beep_on", "Beep ON")
                : t("pos.muted", "Muted")}
            </button>
            <button
              type="button"
              onClick={() => playScannerSound("scan")}
              style={{
                padding: "8px 10px",
                borderRadius: "0 10px 10px 0",
                border: "1px solid #E5E7EB",
                borderLeft: "none",
                background: "#F9FAFB",
                color: "#374151",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              🔊 {t("pos.test_sound", "Test")}
            </button>
          </div>

          <button
            type="button"
            onClick={scannerOpen ? stopScanner : startScanner}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "none",
              background: scannerOpen ? "#EF4444" : "#0066FF",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 4px 10px rgba(0, 102, 255, 0.2)",
            }}
          >
            {scannerOpen ? (
              <>
                <FiCameraOff size={16} />{" "}
                {t("pos.stop_camera", "Close Camera")}
              </>
            ) : (
              <>
                <FiCamera size={16} />{" "}
                {t("pos.start_camera", "Scan with Camera")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="pos-grid">
        {/* LEFT COLUMN */}
        <div
          className="pos-col"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {scannerOpen && (
            <div
              onClick={() => {
                lastScanRef.current = { code: "", time: 0 };
                showScanFeedback(
                  t("pos.ready_scan", "Ready! Hold barcode in front of camera"),
                  false,
                );
              }}
              style={{
                background: "#111827",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                border: "2px solid #0066FF",
                cursor: "pointer",
              }}
            >
              <div
                id="pos-continuous-reader"
                style={{ width: "100%", minHeight: 210 }}
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
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t("pos.starting_camera", "Starting back-camera scanner...")}
                </div>
              )}
              {lastScannedBanner && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    right: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: lastScannedBanner.isError
                      ? "rgba(220, 38, 38, 0.95)"
                      : "rgba(16, 185, 129, 0.95)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: "center",
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
                  padding: "8px 12px",
                  fontSize: 11.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span>
                  🟢{" "}
                  {t(
                    "pos.continuous_mode",
                    "Continuous Scan (Camera stays open)",
                  )}
                </span>
                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                  {t("pos.tap_rescan", "Tap camera to rescan same item")}
                </span>
              </div>
            </div>
          )}

          <div className="pos-panel">
            <div style={{ position: "relative", marginBottom: 12 }}>
              <FiSearch
                size={17}
                color="#9CA3AF"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                maxLength={64}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t(
                  "pos.search_placeholder",
                  "Search product name or barcode...",
                )}
                style={{
                  width: "100%",
                  padding: "11px 65px 11px 38px",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  fontSize: 13.5,
                  outline: "none",
                  background: "#F9FAFB",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "#E5E7EB",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {t("pos.clear", "Clear")}
                </button>
              )}
            </div>

            <div className="pos-category-chips">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`pos-chip ${selectedCategory === "all" ? "active" : ""}`}
              >
                {t("pos.all_categories", "All Products")} (
                {activeProducts.length})
              </button>
              {noBarcodeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("__no_barcode__")}
                  className={`pos-chip warn ${selectedCategory === "__no_barcode__" ? "active" : ""}`}
                >
                  <FiTag size={12} />{" "}
                  {t("pos.no_barcode_filter", "No Barcode")} ({noBarcodeCount})
                </button>
              )}
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`pos-chip ${selectedCategory === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}
              >
                {t("pos.showing_count", "Showing")}{" "}
                <strong>{displayedProducts.length}</strong> /{" "}
                <strong>{filteredProducts.length}</strong>{" "}
                {t("pos.products_unit", "products")}
              </span>

              <div
                style={{
                  display: "flex",
                  background: "#F3F4F6",
                  padding: 3,
                  borderRadius: 10,
                  gap: 4,
                }}
              >
                {[
                  {
                    id: "vertical",
                    icon: <FiArrowDown size={12} />,
                    label: t("pos.scroll_vertical", "Up / Down"),
                  },
                  {
                    id: "horizontal",
                    icon: <FiArrowRight size={12} />,
                    label: t("pos.scroll_horizontal", "Left / Right"),
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScrollDirection(m.id)}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 9px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background:
                        scrollDirection === m.id ? "#fff" : "transparent",
                      color: scrollDirection === m.id ? "#0066FF" : "#6B7280",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                scrollDirection === "horizontal"
                  ? "pos-product-grid-horizontal"
                  : "pos-product-grid-vertical"
              }
            >
              {displayedProducts.map((p) => (
                <PosProductCard
                  key={p.id}
                  product={p}
                  qtyInBill={cartQtyMap.get(p.id) || 0}
                  safeRate={safeRate}
                  onSelect={addItemToBill}
                />
              ))}
            </div>

            {filteredProducts.length > visibleLimit && (
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 48)}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #DBEAFE",
                  background: "#EFF6FF",
                  color: "#0066FF",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <FiChevronDown size={16} />{" "}
                {t(
                  "pos.load_more",
                  isKm ? "បង្ហាញទំនិញបន្ថែមទៀត" : "Show More Products",
                )}{" "}
                ({filteredProducts.length - visibleLimit})
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          ref={billSectionRef}
          className="pos-col pos-panel"
          style={{ position: "sticky", top: 16 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottom: "1px solid #F3F4F6",
              marginBottom: 12,
              gap: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "#111827" }}>
                🧾 {t("pos.current_bill", "Current Counter Bill")}
              </h3>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                {totals.totalItems} {t("pos.items_unit", "items")}
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
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FiTrash2 size={13} /> {t("pos.clear", "Clear")}
              </button>
            )}
          </div>

          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {cart.length === 0 ? (
              <div
                style={{
                  padding: "28px 14px",
                  textAlign: "center",
                  color: "#9CA3AF",
                  background: "#F9FAFB",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              >
                {t(
                  "pos.empty_bill",
                  "Scan a barcode or tap any product to start a bill.",
                )}
              </div>
            ) : (
              cart.map((item) => {
                const lineKhr =
                  Math.round((item.price * item.qty * safeRate) / 100) * 100;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "9px 10px",
                      background: "#F9FAFB",
                      borderRadius: 10,
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
                      <div style={{ fontSize: 11.5, color: "#6B7280" }}>
                        {fmt(item.price)} × {item.qty} ={" "}
                        <strong style={{ color: "#0066FF" }}>
                          {fmt(item.price * item.qty)}
                        </strong>{" "}
                        ({lineKhr.toLocaleString()} ៛)
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="pos-qty-btn"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span
                        style={{
                          minWidth: 20,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="pos-qty-btn plus"
                      >
                        <FiPlus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: 24,
                          height: 26,
                          border: "none",
                          background: "transparent",
                          color: "#EF4444",
                          cursor: "pointer",
                        }}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              background: "#EFF6FF",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 12,
              border: "1px solid #BFDBFE",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 12.5, fontWeight: 700, color: "#1E40AF" }}
              >
                {t("pos.total_due_usd", "TOTAL DUE (USD)")}
              </span>
              <span
                style={{ fontSize: 22, fontWeight: 800, color: "#0066FF" }}
              >
                {fmt(totals.totalUsd)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}
              >
                {t("pos.total_due_khr", "TOTAL DUE (KHR)")}
              </span>
              <span
                style={{ fontSize: 16, fontWeight: 800, color: "#1D4ED8" }}
              >
                {totals.totalKhr.toLocaleString()} ៛
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              {
                id: "cash",
                icon: <FiDollarSign size={15} />,
                label: t("pos.cash_payment", "Cash"),
              },
              {
                id: "bank",
                icon: <FiSmartphone size={15} />,
                label: t("pos.khqr_payment", "ABA KHQR"),
              },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                style={{
                  padding: "9px 8px",
                  borderRadius: 10,
                  border:
                    paymentMethod === pm.id
                      ? "2px solid #0066FF"
                      : "1px solid #E5E7EB",
                  background: paymentMethod === pm.id ? "#EFF6FF" : "#fff",
                  color: paymentMethod === pm.id ? "#0066FF" : "#374151",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                {pm.icon} {pm.label}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && cart.length > 0 && (
            <div
              style={{
                background: "#F9FAFB",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}
                >
                  💵{" "}
                  {t(
                    "pos.cash_calculator_title",
                    "Cash Received & Change Calculator",
                  )}
                </span>
                {(tenderedUsd || tenderedKhr) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTenderedUsd("");
                      setTenderedKhr("");
                    }}
                    style={{
                      border: "none",
                      background: "#FEE2E2",
                      color: "#DC2626",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("pos.reset_cash", "Reset")}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#4B5563",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {t("pos.received_usd", "Received USD ($)")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 800,
                        color: "#059669",
                        fontSize: 13,
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      className="pos-no-spin"
                      placeholder="0.00"
                      value={tenderedUsd}
                      onChange={(e) => handleUsdInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 24px 8px 20px",
                        borderRadius: 8,
                        border: tenderedUsd
                          ? "2px solid #10B981"
                          : "1px solid #D1D5DB",
                        fontSize: 14,
                        fontWeight: 800,
                        background: "#fff",
                        outline: "none",
                      }}
                    />
                    {tenderedUsd && (
                      <button
                        type="button"
                        onClick={() => setTenderedUsd("")}
                        style={{
                          position: "absolute",
                          right: 4,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "#F3F4F6",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <FiX size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#4B5563",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {t("pos.received_khr", "Received Riel (៛)")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="100"
                      className="pos-no-spin"
                      placeholder="0"
                      value={tenderedKhr}
                      onChange={(e) => handleKhrInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 24px 8px 8px",
                        borderRadius: 8,
                        border: tenderedKhr
                          ? "2px solid #0066FF"
                          : "1px solid #D1D5DB",
                        fontSize: 14,
                        fontWeight: 800,
                        background: "#fff",
                        outline: "none",
                      }}
                    />
                    {tenderedKhr ? (
                      <button
                        type="button"
                        onClick={() => setTenderedKhr("")}
                        style={{
                          position: "absolute",
                          right: 4,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "#F3F4F6",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <FiX size={11} />
                      </button>
                    ) : (
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontWeight: 800,
                          color: "#0066FF",
                          fontSize: 13,
                        }}
                      >
                        ៛
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pos-banknote-grid">
                <button
                  type="button"
                  onClick={() => {
                    setTenderedUsd(String(totals.totalUsd));
                    setTenderedKhr("");
                  }}
                  className="pos-note-btn"
                  style={{
                    border: "1px solid #0066FF",
                    background: "#EFF6FF",
                    color: "#0066FF",
                  }}
                >
                  {t("pos.exact_amount", "Exact")}
                </button>
                {[1, 5, 10, 20, 50].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() =>
                      handleUsdInput(
                        String(
                          Math.round(((parseFloat(tenderedUsd) || 0) + b) * 100) /
                            100,
                        ),
                      )
                    }
                    className="pos-note-btn"
                    style={{
                      border: "1px solid #A7F3D0",
                      background: "#ECFDF5",
                      color: "#065F46",
                    }}
                  >
                    +${b}
                  </button>
                ))}
              </div>

              <div className="pos-banknote-grid" style={{ marginBottom: 8 }}>
                {[
                  { km: "+1ពាន់", en: "+1k៛", v: 1000 },
                  { km: "+5ពាន់", en: "+5k៛", v: 5000 },
                  { km: "+1ម៉ឺន", en: "+10k៛", v: 10000 },
                  { km: "+2ម៉ឺន", en: "+20k៛", v: 20000 },
                  { km: "+5ម៉ឺន", en: "+50k៛", v: 50000 },
                  { km: "+10ម៉ឺន", en: "+100k៛", v: 100000 },
                ].map((b) => (
                  <button
                    key={b.v}
                    type="button"
                    onClick={() =>
                      handleKhrInput(
                        String((parseFloat(tenderedKhr) || 0) + b.v),
                      )
                    }
                    className="pos-note-btn"
                    style={{
                      border: "1px solid #BFDBFE",
                      background: "#EFF6FF",
                      color: "#1E40AF",
                    }}
                  >
                    {isKm ? b.km : b.en}
                  </button>
                ))}
              </div>

              {(totals.givenUsd > 0 || totals.givenKhr > 0) && (
                <div
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    background: totals.isEnoughCash ? "#ECFDF5" : "#FEF2F2",
                    border: `1px solid ${totals.isEnoughCash ? "#A7F3D0" : "#FECACA"}`,
                  }}
                >
                  {totals.isEnoughCash ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 4,
                          fontWeight: 800,
                          color: "#065F46",
                          fontSize: 13.5,
                        }}
                      >
                        <span>{t("pos.change_due", "CHANGE DUE")}:</span>
                        <span>
                          {fmt(totals.changeUsd)} (
                          {totals.changeKhr.toLocaleString()} ៛)
                        </span>
                      </div>
                      {totals.wholeUsdChange > 0 &&
                        totals.remainderKhrChange > 0 && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#047857",
                              marginTop: 4,
                              fontWeight: 600,
                            }}
                          >
                            ✓ {t("pos.give_customer", "Give customer")}:{" "}
                            <strong>{fmt(totals.wholeUsdChange)}</strong> +{" "}
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
                        fontSize: 12.5,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{t("pos.still_short", "Still short by")}:</span>
                      <span>
                        {fmt(totals.totalUsd - totals.totalGivenInUsd)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            full
            disabled={
              cart.length === 0 || isCompleting || !totals.isEnoughCash
            }
            onClick={handleCompleteSale}
            style={{
              padding: "13px",
              fontSize: 15,
              fontWeight: 800,
              borderRadius: 12,
              background: cart.length === 0 ? "#9CA3AF" : "#10B981",
            }}
          >
            {isCompleting
              ? t("pos.recording_sale", "Recording Sale...")
              : `✅ ${t("pos.complete_sale", "Complete Sale")} (${fmt(totals.totalUsd)})`}
          </Button>
        </div>
      </div>

      {/* Auto-Hiding Mobile Jump Bar */}
      {cart.length > 0 && !isBillVisible && (
        <div
          className="pos-mobile-jump-bar"
          onClick={() =>
            billSectionRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              🧾 {totals.totalItems} {t("pos.items_unit", "items")} •{" "}
              {fmt(totals.totalUsd)}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
              {totals.totalKhr.toLocaleString()} ៛
            </div>
          </div>
          <div
            style={{
              background: "#10B981",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12.5,
            }}
          >
            {isKm ? "មើលវិក្កយបត្រ / គិតលុយ ↓" : "View Bill / Pay ↓"}
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
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
              maxWidth: 360,
              padding: 22,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <FiCheckCircle size={34} color="#10B981" />
              <h3 style={{ margin: "6px 0 2px", fontSize: 18 }}>SOPHEA MART</h3>
              <div style={{ fontSize: 11.5, color: "#6B7280" }}>
                #{completedReceipt.id} • {completedReceipt.date}
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7280" }}>
                {t("pos.cashier_label", "Cashier")}: {completedReceipt.cashier}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px dashed #D1D5DB",
                borderBottom: "1px dashed #D1D5DB",
                padding: "10px 0",
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
                    fontSize: 12.5,
                  }}
                >
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <strong>{fmt(item.price * item.qty)}</strong>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13.5, marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                <span>{t("pos.total_due_usd", "TOTAL DUE (USD)")}:</span>
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
                <span>{t("pos.total_due_khr", "TOTAL DUE (KHR)")}:</span>
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
                  <span>{t("pos.change_due", "CHANGE DUE")}:</span>
                  <span>
                    {fmt(completedReceipt.changeUsd)} (
                    {completedReceipt.changeKhr.toLocaleString()} ៛)
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #D1D5DB",
                  background: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <FiPrinter size={15} /> {t("pos.print_receipt", "Print")}
              </button>
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                style={{
                  flex: 1.4,
                  padding: "10px",
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
                  fontSize: 13,
                }}
              >
                <FiRefreshCw size={15} />{" "}
                {t("pos.next_customer", "Next Customer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
