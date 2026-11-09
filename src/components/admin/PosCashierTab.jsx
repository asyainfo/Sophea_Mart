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

const DEFAULT_EXCHANGE_RATE = 4000;
const SAME_BARCODE_COOLDOWN_MS = 1200;
const INITIAL_VISIBLE_COUNT = 36;

const POS_DICT = {
  en: {
    title: "Fast POS Counter Scanner",
    subtitle: "Scan barcodes continuously by phone or tap products below",
    rate_label: "Rate",
    beep_on: "Beep ON",
    muted: "Muted",
    test_sound: "Test",
    start_camera: "Scan with Camera",
    stop_camera: "Close Camera",
    continuous_mode: "Continuous Scan (Camera stays open)",
    tap_rescan: "Tap camera to rescan same item",
    ready_scan: "Ready! Hold barcode in front of camera",
    starting_camera: "Starting back-camera scanner...",
    barcode_not_found: "Barcode not found",
    search_placeholder: "Search product name or barcode...",
    clear: "Clear",
    all_categories: "All Products",
    no_barcode_filter: "No Barcode",
    showing_count: "Showing",
    of_total: "of",
    products_unit: "products",
    load_more: "Show More Products",
    scroll_vertical: "Grid",
    scroll_horizontal: "Swipe",
    current_bill: "Current Counter Bill",
    items_unit: "items",
    empty_bill: "Scan a barcode or tap any product to start a bill.",
    total_due_usd: "TOTAL DUE (USD)",
    total_due_khr: "TOTAL DUE (KHR)",
    cash_payment: "Cash",
    khqr_payment: "ABA KHQR",
    cash_calculator_title: "Cash Received & Change",
    reset_cash: "Reset",
    received_usd: "Received USD ($)",
    received_khr: "Received Riel (៛)",
    exact_amount: "Exact",
    change_due: "CHANGE DUE:",
    give_customer: "Give customer:",
    still_short: "Still short:",
    complete_sale: "Complete Sale",
    recording_sale: "Recording...",
    print_receipt: "Print",
    next_customer: "Next Customer",
    cashier_label: "Cashier",
    view_bill: "View Bill / Pay",
  },
  km: {
    title: "ម៉ាស៊ីនគិតលុយរហ័ស (POS)",
    subtitle: "ស្កេនបាកូដទំនិញជាប់ៗគ្នាដោយទូរស័ព្ទ ឬចុចជ្រើសរើសទំនិញខាងក្រោម",
    rate_label: "អត្រា",
    beep_on: "សំឡេងស្កេន",
    muted: "បិទសំឡេង",
    test_sound: "សាកសំឡេង",
    start_camera: "បើកកាមេរ៉ាស្កេន",
    stop_camera: "បិទកាមេរ៉ា",
    continuous_mode: "ស្កេនជាប់ៗគ្នា (កាមេរ៉ាបើកជានិច្ច)",
    tap_rescan: "ចុចលើកាមេរ៉ាដើម្បីស្កេនម្តងទៀត",
    ready_scan: "រួចរាល់! សូមដាក់បាកូដនៅមុខកាមេរ៉ា",
    starting_camera: "កំពុងបើកកាមេរ៉ាស្កេនបាកូដ...",
    barcode_not_found: "រកមិនឃើញបាកូដនេះទេ",
    search_placeholder: "ស្វែងរកឈ្មោះទំនិញ ឬវាយលេខបាកូដ...",
    clear: "សម្អាត",
    all_categories: "ទំនិញទាំងអស់",
    no_barcode_filter: "គ្មានបាកូដ",
    showing_count: "បង្ហាញ",
    of_total: "ក្នុងចំណោម",
    products_unit: "មុខទំនិញ",
    load_more: "បង្ហាញទំនិញបន្ថែមទៀត",
    scroll_vertical: "អូសលើ-ក្រោម",
    scroll_horizontal: "អូសឆ្វេង-ស្តាំ",
    current_bill: "វិក្កយបត្រគិតលុយបច្ចុប្បន្ន",
    items_unit: "មុខ",
    empty_bill: "សូមស្កេនបាកូដទំនិញ ឬចុចជ្រើសរើសទំនិញដើម្បីគិតលុយ។",
    total_due_usd: "សរុបជាប្រាក់ដុល្លារ (USD)",
    total_due_khr: "សរុបជាប្រាក់រៀល (KHR)",
    cash_payment: "សាច់ប្រាក់សុទ្ធ",
    khqr_payment: "ABA KHQR",
    cash_calculator_title: "គណនាប្រាក់ទទួល និងប្រាក់អាប់",
    reset_cash: "កំណត់ឡើងវិញ",
    received_usd: "ប្រាក់ទទួលជាដុល្លារ ($)",
    received_khr: "ប្រាក់ទទួលជារៀល (៛)",
    exact_amount: "គ្រប់ចំនួន",
    change_due: "ប្រាក់ត្រូវអាប់:",
    give_customer: "ណែនាំរបៀបអាប់:",
    still_short: "ខ្វះទឹកប្រាក់:",
    complete_sale: "បញ្ចប់ការលក់",
    recording_sale: "កំពុងរក្សាទុក...",
    print_receipt: "បោះពុម្ព",
    next_customer: "អតិថិជនបន្ទាប់",
    cashier_label: "អ្នកគិតលុយ",
    view_bill: "មើលវិក្កយបត្រ / គិតលុយ",
  },
};

// 🔊 Authentic Supermarket Laser Barcode Scanner Sound (Zebra/Honeywell 2650Hz Harmonic Pulse)
let sharedAudioCtx = null;
function playSupermarketScannerSound(type = "scan") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;

    if (type === "scan") {
      const osc1 = sharedAudioCtx.createOscillator();
      const osc2 = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();

      osc1.type = "triangle";
      osc2.type = "square";
      osc1.frequency.setValueAtTime(2650, now);
      osc2.frequency.setValueAtTime(5300, now);

      const osc2Gain = sharedAudioCtx.createGain();
      osc2Gain.gain.setValueAtTime(0.18, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.005);
      gain.gain.setValueAtTime(0.32, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);

      osc1.connect(gain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gain);
      gain.connect(sharedAudioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.075);
      osc2.stop(now + 0.075);
    } else if (type === "complete") {
      [2100, 2800].forEach((freq, idx) => {
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        const start = now + idx * 0.085;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.28, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.075);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.08);
      });
    } else {
      [0, 0.12].forEach((offset) => {
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        const start = now + offset;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, start);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.095);
      });
    }
  } catch {
    // Ignore audio context restrictions
  }
}

// Force-release any active video hardware tracks inside the scanner container
function forceReleaseCameraHardware() {
  try {
    const container = document.getElementById("pos-continuous-reader");
    if (!container) return;
    const videos = container.querySelectorAll("video");
    videos.forEach((video) => {
      if (video.srcObject && typeof video.srcObject.getTracks === "function") {
        video.srcObject.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track stop errors
          }
        });
        video.srcObject = null;
      }
    });
  } catch {
    // Ignore DOM cleanup errors
  }
}

// ⚡ Memoized Product Card for 60fps scrolling & zero unnecessary re-renders
const PosProductCard = memo(function PosProductCard({
  product,
  qtyInBill,
  safeRate,
  onSelect,
}) {
  const price = Number(product.price ?? product.price_usd ?? 0);
  const khr = Math.round((price * safeRate) / 100) * 100;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="pos-product-card"
      style={{
        border: qtyInBill > 0 ? "2px solid #0066FF" : "1px solid #E5E7EB",
        background: qtyInBill > 0 ? "#EFF6FF" : "#FFFFFF",
      }}
    >
      {qtyInBill > 0 && <span className="pos-card-badge">×{qtyInBill}</span>}
      {product.image_url || product.image ? (
        <img
          src={product.image_url || product.image}
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
  const L = useCallback(
    (key) => {
      const dict = isKm ? POS_DICT.km : POS_DICT.en;
      return dict[key] || POS_DICT.en[key] || key;
    },
    [isKm],
  );

  // POS Cart & Browsing State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [scrollDirection, setScrollDirection] = useState("vertical");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_COUNT);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  // Cash Tendered State
  const [tenderedUsd, setTenderedUsd] = useState("");
  const [tenderedKhr, setTenderedKhr] = useState("");

  // Continuous Camera Scanner State
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
  const submittingSaleRef = useRef(false);

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

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Reset pagination limit when filter or search changes
  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_COUNT);
  }, [searchQuery, selectedCategory]);

  const safeRate = useMemo(() => {
    const num = Number(exchangeRate);
    return num >= 100 ? num : DEFAULT_EXCHANGE_RATE;
  }, [exchangeRate]);

  // Fast O(1) barcode lookup map + ALL active products + category list
  const { barcodeMap, activeProducts, categories, noBarcodeCount } =
    useMemo(() => {
      const map = new Map();
      const active = [];
      const catSet = new Set();
      let missingBarcode = 0;

      (products || []).forEach((p) => {
        if (p.in_stock === false) return;
        active.push(p);

        if (p.category && String(p.category).trim()) {
          catSet.add(String(p.category).trim());
        }

        const hasBarcode = Boolean(
          (p.barcode && String(p.barcode).trim()) ||
            (p.code && String(p.code).trim()) ||
            (p.sku && String(p.sku).trim()),
        );
        if (!hasBarcode) missingBarcode += 1;

        const rawCodes = [p.barcode, p.code, p.sku, String(p.id)]
          .filter(Boolean)
          .map((c) => String(c).trim().toLowerCase());

        rawCodes.forEach((code) => {
          if (code) map.set(code, p);
        });
      });

      return {
        barcodeMap: map,
        activeProducts: active,
        categories: Array.from(catSet),
        noBarcodeCount: missingBarcode,
      };
    }, [products]);

  // Filter across all 265 products instantaneously
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (selectedCategory === "__no_barcode__") {
        const hasBarcode = Boolean(
          (p.barcode && String(p.barcode).trim()) ||
            (p.code && String(p.code).trim()) ||
            (p.sku && String(p.sku).trim()),
        );
        if (hasBarcode) return false;
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

  // Slice for blazing-fast DOM rendering while allowing instant "Show More"
  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, visibleLimit),
    [filteredProducts, visibleLimit],
  );

  // Fast O(1) map of product quantities currently in bill
  const cartQtyMap = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => map.set(item.id, item.qty));
    return map;
  }, [cart]);

  const showScanFeedback = useCallback((text, isError = false) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setLastScannedBanner({ text, isError });
    bannerTimerRef.current = setTimeout(() => {
      setLastScannedBanner(null);
    }, 2000);
  }, []);

  // Stable callback so PosProductCard never re-renders unnecessarily
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

      if (soundEnabledRef.current) playSupermarketScannerSound("scan");
      try {
        if (navigator.vibrate) navigator.vibrate(35);
      } catch {
        // Ignore vibration permission
      }

      showScanFeedback(`+1 ${product.name} (${fmt(unitPrice)})`, false);
    },
    [showScanFeedback],
  );

  const updateQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearBill = useCallback(() => {
    setCart([]);
    setTenderedUsd("");
    setTenderedKhr("");
    setCompletedReceipt(null);
    lastScanRef.current = { code: "", time: 0 };
  }, []);

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
      if (soundEnabledRef.current) playSupermarketScannerSound("error");
      try {
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      } catch {
        // Ignore
      }
      showScanFeedback(`${L("barcode_not_found")}: ${cleanCode}`, true);
      setSelectedCategory("all");
      setSearchQuery(cleanCode);
    }
  };

  // Stop camera & release hardware tracks immediately
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
    forceReleaseCameraHardware();
    setScannerOpen(false);
    setCameraStarting(false);
  }, []);

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
            fps: 18,
            qrbox: { width: 240, height: 115 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            if (handleBarcodeDetectedRef.current) {
              handleBarcodeDetectedRef.current(decodedText);
            }
          },
          () => {},
        );
      } catch (err) {
        console.error("POS Camera Error:", err);
        forceReleaseCameraHardware();
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
    }, 60);
  }, [cameraStarting, triggerToast, t]);

  // USB / Bluetooth Hardware Laser Scanner Gun listener (detects rapid keystrokes anywhere on POS tab)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();
      if (now - lastKeyTime > 80) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter" && buffer.length >= 4) {
        e.preventDefault();
        const code = buffer.trim();
        buffer = "";
        handleBarcodeDetectedRef.current?.(code);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      stopScanner();
    };
  }, [stopScanner]);

  const totals = useMemo(() => {
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    const totalUsd =
      Math.round(cart.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;
    const totalKhr = Math.round((totalUsd * safeRate) / 100) * 100;

    const givenUsd = parseFloat(tenderedUsd) || 0;
    const givenKhr = parseFloat(tenderedKhr) || 0;
    const totalGivenInUsd = givenUsd + givenKhr / safeRate;

    const changeUsdRaw = totalGivenInUsd - totalUsd;
    const changeUsd =
      changeUsdRaw > 0.004 ? Math.round(changeUsdRaw * 100) / 100 : 0;
    const changeKhr =
      changeUsdRaw > 0.004
        ? Math.round((changeUsdRaw * safeRate) / 100) * 100
        : 0;

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

  // ⚡ Complete Sale with Zero Redundant Supabase Refetches
  const handleCompleteSale = async () => {
    if (
      cart.length === 0 ||
      isCompleting ||
      submittingSaleRef.current
    ) {
      return;
    }

    if (!totals.isEnoughCash) {
      triggerToast?.(
        isKm
          ? "ប្រាក់ទទួលតិចជាងទឹកប្រាក់សរុប!"
          : "Cash received is less than the bill total!",
        "error",
      );
      return;
    }

    submittingSaleRef.current = true;
    setIsCompleting(true);

    const orderId = `POS-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const cashierName =
      profile?.full_name || user?.email?.split("@")[0] || "Cashier";

    try {
      const orderPayload = {
        id: orderId,
        user_id: user?.id || null,
        payment_method: paymentMethod,
        total_items: totals.totalItems,
        total_usd: totals.totalUsd,
        status: "completed",
      };

      const { error: orderErr } = await supabase
        .from("Orders")
        .insert([orderPayload]);

      if (orderErr) throw orderErr;

      const orderItemsPayload = cart.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        price: item.price,
      }));

      // Insert order_items without blocking UI
      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsErr) {
        console.warn("Note inserting POS order_items:", itemsErr.message);
      }

      if (soundEnabledRef.current) playSupermarketScannerSound("complete");

      setCompletedReceipt({
        id: orderId,
        date: new Date().toLocaleString(isKm ? "km-KH" : "en-US", {
          timeZone: "Asia/Phnom_Penh",
        }),
        cashier: cashierName,
        items: [...cart],
        paymentMethod,
        totalUsd: totals.totalUsd,
        totalKhr: totals.totalKhr,
        givenUsd: totals.givenUsd,
        givenKhr: totals.givenKhr,
        changeUsd: totals.changeUsd,
        changeKhr: totals.changeKhr,
      });

      setCart([]);
      setTenderedUsd("");
      setTenderedKhr("");
      triggerToast?.(`✅ ${orderId} (${fmt(totals.totalUsd)})`, "success");

      // Pass new order & items directly to AdminDashboard so it updates in <1ms without re-downloading the entire database!
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
      submittingSaleRef.current = false;
      setIsCompleting(false);
    }
  };

  return (
    <div className="pos-wrapper">
      <style>
        {`
          .pos-wrapper, .pos-wrapper * {
            box-sizing: border-box;
          }
          .pos-wrapper {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }
          .pos-no-spin::-webkit-outer-spin-button,
          .pos-no-spin::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .pos-no-spin {
            -moz-appearance: textfield;
          }

          /* Top Toolbar */
          .pos-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
            background: #FFFFFF;
            padding: 14px 16px;
            border-radius: 16px;
            border: 1px solid #F3F4F6;
            width: 100%;
          }
          .pos-toolbar-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          /* Main 2-Column Layout with strict min-width: 0 to prevent horizontal overflow */
          .pos-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
            gap: 18px;
            align-items: start;
            width: 100%;
          }
          .pos-col {
            min-width: 0;
            width: 100%;
            max-width: 100%;
          }

          /* Category Chips Scroll Row */
          .pos-category-chips {
            display: flex;
            gap: 8px;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            padding-bottom: 6px;
            margin-bottom: 12px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .pos-category-chips::-webkit-scrollbar {
            display: none;
          }

          /* Product Grids */
          .pos-product-grid-vertical {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
            gap: 10px;
            max-height: 520px;
            overflow-y: auto;
            width: 100%;
            padding-right: 2px;
          }
          .pos-product-grid-horizontal {
            display: grid;
            grid-template-rows: repeat(2, auto);
            grid-auto-flow: column;
            grid-auto-columns: 136px;
            gap: 10px;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            padding-bottom: 10px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .pos-product-grid-horizontal > button {
            scroll-snap-align: start;
          }

          /* Product Card with GPU / Layout optimization */
          .pos-product-card {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            padding: 10px;
            border-radius: 14px;
            cursor: pointer;
            position: relative;
            width: 100%;
            min-width: 0;
            overflow: hidden;
            transition: transform 0.1s ease;
            content-visibility: auto;
            contain-intrinsic-size: 145px;
          }
          .pos-product-card:active {
            transform: scale(0.97);
          }
          .pos-card-badge {
            position: absolute;
            top: 6px;
            right: 6px;
            background: #0066FF;
            color: #FFFFFF;
            border-radius: 999px;
            padding: 2px 7px;
            font-size: 11px;
            font-weight: 800;
            z-index: 2;
          }
          .pos-card-img {
            width: 100%;
            height: 72px;
            object-fit: contain;
            border-radius: 8px;
            background: #F9FAFB;
            margin-bottom: 8px;
          }
          .pos-card-placeholder {
            width: 100%;
            height: 72px;
            border-radius: 8px;
            background: #F3F4F6;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            color: #9CA3AF;
          }
          .pos-card-title {
            font-size: 12.5px;
            font-weight: 600;
            color: #111827;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .pos-card-usd {
            font-size: 13px;
            font-weight: 800;
            color: #0066FF;
            margin-top: 2px;
          }
          .pos-card-khr {
            font-size: 11px;
            color: #6B7280;
          }

          /* Quick Banknote Grid */
          .pos-banknote-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
            margin-bottom: 8px;
            width: 100%;
          }
          @media (min-width: 480px) {
            .pos-banknote-grid {
              grid-template-columns: repeat(6, minmax(0, 1fr));
            }
          }

          /* Floating Mobile Checkout Jump Bar */
          .pos-mobile-jump-bar {
            display: none;
          }

          @media (max-width: 960px) {
            .pos-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .pos-product-grid-vertical {
              grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
              max-height: 420px;
            }
            .pos-mobile-jump-bar {
              display: flex;
              position: fixed;
              bottom: 12px;
              left: 12px;
              right: 12px;
              background: #111827;
              color: #FFFFFF;
              padding: 12px 16px;
              border-radius: 14px;
              justify-content: space-between;
              align-items: center;
              z-index: 900;
              box-shadow: 0 10px 25px rgba(0,0,0,0.25);
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
              {L("title")}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
                lineHeight: 1.3,
              }}
            >
              {L("subtitle")}
            </p>
          </div>
        </div>

        <div className="pos-toolbar-controls">
          {/* Exchange Rate Selector */}
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
            <span>{L("rate_label")}:</span>
            <input
              type="number"
              step="50"
              className="pos-no-spin"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
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
                  background:
                    Number(exchangeRate) === preset ? "#0066FF" : "#E5E7EB",
                  color: Number(exchangeRate) === preset ? "#fff" : "#374151",
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Supermarket Laser Beep Toggle + Test */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playSupermarketScannerSound("scan");
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
              {soundEnabled ? L("beep_on") : L("muted")}
            </button>
            <button
              type="button"
              onClick={() => playSupermarketScannerSound("scan")}
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
              🔊 {L("test_sound")}
            </button>
          </div>

          {/* Toggle Camera Scanner Button */}
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
                <FiCameraOff size={16} /> {L("stop_camera")}
              </>
            ) : (
              <>
                <FiCamera size={16} /> {L("start_camera")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div className="pos-grid">
        {/* LEFT COLUMN: Camera + All Products Browser */}
        <div
          className="pos-col"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Continuous Phone Camera Viewfinder */}
          {scannerOpen && (
            <div
              onClick={() => {
                lastScanRef.current = { code: "", time: 0 };
                showScanFeedback(L("ready_scan"), false);
              }}
              style={{
                background: "#111827",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                border: "2px solid #0066FF",
                cursor: "pointer",
                width: "100%",
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
                  {L("starting_camera")}
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
                <span>🟢 {L("continuous_mode")}</span>
                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                  {L("tap_rescan")}
                </span>
              </div>
            </div>
          )}

          {/* Product Browser Card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              border: "1px solid #F3F4F6",
              width: "100%",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* Search Input */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={L("search_placeholder")}
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
                  {L("clear")}
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Category Pills */}
            <div className="pos-category-chips">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    selectedCategory === "all" ? "#0066FF" : "#F3F4F6",
                  color: selectedCategory === "all" ? "#fff" : "#374151",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {L("all_categories")} ({activeProducts.length})
              </button>

              {noBarcodeCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("__no_barcode__")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      selectedCategory === "__no_barcode__"
                        ? "#F59E0B"
                        : "#FEF3C7",
                    color:
                      selectedCategory === "__no_barcode__"
                        ? "#fff"
                        : "#B45309",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <FiTag size={12} /> {L("no_barcode_filter")} ({noBarcodeCount}
                  )
                </button>
              )}

              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      selectedCategory === cat ? "#0066FF" : "#F3F4F6",
                    color: selectedCategory === cat ? "#fff" : "#374151",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Count + Scroll Direction Switcher */}
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
                {L("showing_count")}{" "}
                <strong>{displayedProducts.length}</strong> {L("of_total")}{" "}
                <strong>{filteredProducts.length}</strong> {L("products_unit")}
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
                <button
                  type="button"
                  onClick={() => setScrollDirection("vertical")}
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
                      scrollDirection === "vertical" ? "#fff" : "transparent",
                    color:
                      scrollDirection === "vertical" ? "#0066FF" : "#6B7280",
                    boxShadow:
                      scrollDirection === "vertical"
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  <FiArrowDown size={12} /> {L("scroll_vertical")}
                </button>
                <button
                  type="button"
                  onClick={() => setScrollDirection("horizontal")}
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
                      scrollDirection === "horizontal" ? "#fff" : "transparent",
                    color:
                      scrollDirection === "horizontal" ? "#0066FF" : "#6B7280",
                    boxShadow:
                      scrollDirection === "horizontal"
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  <FiArrowRight size={12} /> {L("scroll_horizontal")}
                </button>
              </div>
            </div>

            {/* Fast Memoized Product Grid */}
            <div
              className={
                scrollDirection === "horizontal"
                  ? "pos-product-grid-horizontal"
                  : "pos-product-grid-vertical"
              }
            >
              {displayedProducts.map((product) => (
                <PosProductCard
                  key={product.id}
                  product={product}
                  qtyInBill={cartQtyMap.get(product.id) || 0}
                  safeRate={safeRate}
                  onSelect={addItemToBill}
                />
              ))}
            </div>

            {/* Load More Button */}
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
                <FiChevronDown size={16} /> {L("load_more")} (
                {filteredProducts.length - visibleLimit})
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Cashier Bill & Cash Calculator */}
        <div
          ref={billSectionRef}
          className="pos-col"
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 18,
            border: "1px solid #F3F4F6",
            position: "sticky",
            top: 16,
          }}
        >
          {/* Bill Header */}
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
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#111827" }}>
                🧾 {L("current_bill")}
              </h3>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                {totals.totalItems} {L("items_unit")}
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
                  flexShrink: 0,
                }}
              >
                <FiTrash2 size={13} /> {L("clear")}
              </button>
            )}
          </div>

          {/* Scanned Items List */}
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
                {L("empty_bill")}
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
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          border: "1px solid #D1D5DB",
                          background: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
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
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          border: "none",
                          background: "#0066FF",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
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
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
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

          {/* Dual-Currency Total Box */}
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
                gap: 8,
              }}
            >
              <span
                style={{ fontSize: 12.5, fontWeight: 700, color: "#1E40AF" }}
              >
                {L("total_due_usd")}
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
                gap: 8,
                marginTop: 4,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}
              >
                {L("total_due_khr")}
              </span>
              <span
                style={{ fontSize: 16, fontWeight: 800, color: "#1D4ED8" }}
              >
                {totals.totalKhr.toLocaleString()} ៛
              </span>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              style={{
                padding: "9px 8px",
                borderRadius: 10,
                border:
                  paymentMethod === "cash"
                    ? "2px solid #0066FF"
                    : "1px solid #E5E7EB",
                background: paymentMethod === "cash" ? "#EFF6FF" : "#fff",
                color: paymentMethod === "cash" ? "#0066FF" : "#374151",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <FiDollarSign size={15} /> {L("cash_payment")}
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              style={{
                padding: "9px 8px",
                borderRadius: 10,
                border:
                  paymentMethod === "bank"
                    ? "2px solid #0066FF"
                    : "1px solid #E5E7EB",
                background: paymentMethod === "bank" ? "#EFF6FF" : "#fff",
                color: paymentMethod === "bank" ? "#0066FF" : "#374151",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <FiSmartphone size={15} /> {L("khqr_payment")}
            </button>
          </div>

          {/* Cash Received & Change Calculator */}
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
                  gap: 6,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}
                >
                  💵 {L("cash_calculator_title")}
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
                    {L("reset_cash")}
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
                    {L("received_usd")}
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
                      step="any"
                      className="pos-no-spin"
                      placeholder="0.00"
                      value={tenderedUsd}
                      onChange={(e) => setTenderedUsd(e.target.value)}
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
                    {L("received_khr")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      step="100"
                      className="pos-no-spin"
                      placeholder="0"
                      value={tenderedKhr}
                      onChange={(e) => setTenderedKhr(e.target.value)}
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

              {/* Responsive Banknote Shortcuts */}
              <div className="pos-banknote-grid">
                <button
                  type="button"
                  onClick={() => {
                    setTenderedUsd(String(totals.totalUsd));
                    setTenderedKhr("");
                  }}
                  style={{
                    padding: "6px 2px",
                    borderRadius: 7,
                    border: "1px solid #0066FF",
                    background: "#EFF6FF",
                    color: "#0066FF",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {L("exact_amount")}
                </button>
                {[1, 5, 10, 20, 50].map((usdBill) => (
                  <button
                    key={usdBill}
                    type="button"
                    onClick={() =>
                      setTenderedUsd((prev) =>
                        String(
                          Math.round(
                            ((parseFloat(prev) || 0) + usdBill) * 100,
                          ) / 100,
                        ),
                      )
                    }
                    style={{
                      padding: "6px 2px",
                      borderRadius: 7,
                      border: "1px solid #A7F3D0",
                      background: "#ECFDF5",
                      color: "#065F46",
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    +${usdBill}
                  </button>
                ))}
              </div>

              <div className="pos-banknote-grid" style={{ marginBottom: 8 }}>
                {[
                  { label: "+1ពាន់", val: 1000, en: "+1k៛" },
                  { label: "+5ពាន់", val: 5000, en: "+5k៛" },
                  { label: "+1ម៉ឺន", val: 10000, en: "+10k៛" },
                  { label: "+2ម៉ឺន", val: 20000, en: "+20k៛" },
                  { label: "+5ម៉ឺន", val: 50000, en: "+50k៛" },
                  { label: "+10ម៉ឺន", val: 100000, en: "+100k៛" },
                ].map((khrBill) => (
                  <button
                    key={khrBill.val}
                    type="button"
                    onClick={() =>
                      setTenderedKhr((prev) =>
                        String((parseFloat(prev) || 0) + khrBill.val),
                      )
                    }
                    style={{
                      padding: "6px 2px",
                      borderRadius: 7,
                      border: "1px solid #BFDBFE",
                      background: "#EFF6FF",
                      color: "#1E40AF",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {isKm ? khrBill.label : khrBill.en}
                  </button>
                ))}
              </div>

              {/* Change Due Box */}
              {(totals.givenUsd > 0 || totals.givenKhr > 0) && (
                <div
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
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
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 4,
                          fontWeight: 800,
                          color: "#065F46",
                          fontSize: 13.5,
                        }}
                      >
                        <span>{L("change_due")}</span>
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
                            ✓ {L("give_customer")}{" "}
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
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{L("still_short")}</span>
                      <span>
                        {fmt(totals.totalUsd - totals.totalGivenInUsd)}
                      </span>
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
              padding: "13px",
              fontSize: 15,
              fontWeight: 800,
              borderRadius: 12,
              background: cart.length === 0 ? "#9CA3AF" : "#10B981",
            }}
          >
            {isCompleting
              ? L("recording_sale")
              : `✅ ${L("complete_sale")} (${fmt(totals.totalUsd)})`}
          </Button>
        </div>
      </div>

      {/* Floating Bottom Jump Bar on Mobile when Cart has Items & Bill is Off-screen */}
      {cart.length > 0 && !isBillVisible && (
        <div
          className="pos-mobile-jump-bar"
          onClick={() =>
            billSectionRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              🧾 {totals.totalItems} {L("items_unit")} • {fmt(totals.totalUsd)}
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
            {L("view_bill")} ↓
          </div>
        </div>
      )}

      {/* Printable Walk-In Receipt Modal */}
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
                {L("cashier_label")}: {completedReceipt.cashier}
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
                <span>{L("total_due_usd")}:</span>
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
                <span>{L("total_due_khr")}:</span>
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
                  <span>{L("change_due")}</span>
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
                <FiPrinter size={15} /> {L("print_receipt")}
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
                <FiRefreshCw size={15} /> {L("next_customer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
