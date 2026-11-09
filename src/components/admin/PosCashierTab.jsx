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
  FiX,
  FiArrowDown,
  FiArrowRight,
  FiTag,
} from "react-icons/fi";
import { supabase } from "../../services/supabase";
import { fmt } from "../../utils/currency";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next";

const DEFAULT_EXCHANGE_RATE = 4000;
const SAME_BARCODE_COOLDOWN_MS = 1200;

// Built-in Khmer & English fallback dictionary so translations work 100% even if i18n keys are cached
const POS_DICT = {
  en: {
    title: "Fast POS Counter Scanner",
    subtitle:
      "Scan multiple items continuously by phone or select products below",
    rate_label: "1$ =",
    beep_on: "Laser Beep",
    muted: "Muted",
    test_sound: "Test Beep",
    start_camera: "Scan with Phone Camera",
    stop_camera: "Close Camera",
    continuous_mode: "Continuous Scan Mode (Camera stays open)",
    tap_rescan: "Tap camera to scan same item again",
    ready_scan: "Ready! Hold barcode in front of camera",
    starting_camera: "Starting back-camera barcode scanner...",
    barcode_not_found: "Barcode not found",
    search_placeholder: "Search product name or scan/type barcode...",
    clear: "Clear",
    all_categories: "All Products",
    no_barcode_filter: "No Barcode",
    showing_count: "Showing",
    products_unit: "products",
    scroll_vertical: "Up / Down",
    scroll_horizontal: "Left / Right",
    current_bill: "Current Counter Bill",
    items_unit: "items",
    empty_bill:
      "Scan a barcode with your phone camera or tap any product on the left to start a bill.",
    total_due_usd: "TOTAL DUE (USD)",
    total_due_khr: "TOTAL DUE (KHR)",
    cash_payment: "Cash",
    khqr_payment: "ABA KHQR",
    cash_calculator_title: "Cash Received & Change Calculator",
    reset_cash: "Reset Cash",
    received_usd: "Received USD ($)",
    received_khr: "Received Riel (៛)",
    exact_amount: "Exact",
    usd_notes: "USD Notes ($)",
    khr_notes: "Riel Notes (៛)",
    change_due: "CHANGE DUE:",
    give_customer: "Suggested Change:",
    still_short: "Still short by",
    complete_sale: "Complete Sale",
    recording_sale: "Recording Sale...",
    print_receipt: "Print Receipt",
    next_customer: "Next Customer",
    cashier_label: "Cashier",
  },
  km: {
    title: "ម៉ាស៊ីនគិតលុយរហ័ស (POS)",
    subtitle:
      "ស្កេនបាកូដទំនិញជាប់ៗគ្នាដោយទូរស័ព្ទ ឬចុចជ្រើសរើសទំនិញទាំងអស់ខាងក្រោម",
    rate_label: "1$ =",
    beep_on: "សំឡេងស្កេន",
    muted: "បិទសំឡេង",
    test_sound: "សាកសំឡេង",
    start_camera: "បើកកាមេរ៉ាស្កេនទំនិញ",
    stop_camera: "បិទកាមេរ៉ា",
    continuous_mode: "ប្រព័ន្ធស្កេនជាប់ៗគ្នា (កាមេរ៉ាបើកជានិច្ច)",
    tap_rescan: "ចុចលើកាមេរ៉ាដើម្បីស្កេនទំនិញដដែលម្តងទៀត",
    ready_scan: "រួចរាល់! សូមដាក់បាកូដនៅមុខកាមេរ៉ា",
    starting_camera: "កំពុងបើកកាមេរ៉ាស្កេនបាកូដ...",
    barcode_not_found: "រកមិនឃើញបាកូដនេះទេ",
    search_placeholder: "ស្វែងរកឈ្មោះទំនិញ ឬវាយលេខបាកូដ...",
    clear: "សម្អាត",
    all_categories: "ទំនិញទាំងអស់",
    no_barcode_filter: "គ្មានបាកូដ",
    showing_count: "បង្ហាញ",
    products_unit: "មុខទំនិញ",
    scroll_vertical: "អូសលើ-ក្រោម",
    scroll_horizontal: "អូសឆ្វេង-ស្តាំ",
    current_bill: "វិក្កយបត្រគិតលុយបច្ចុប្បន្ន",
    items_unit: "មុខ",
    empty_bill:
      "សូមស្កេនបាកូដទំនិញ ឬចុចជ្រើសរើសទំនិញនៅខាងឆ្វេងដើម្បីគិតលុយ។",
    total_due_usd: "សរុបជាប្រាក់ដុល្លារ (USD)",
    total_due_khr: "សរុបជាប្រាក់រៀល (KHR)",
    cash_payment: "សាច់ប្រាក់សុទ្ធ",
    khqr_payment: "ABA KHQR",
    cash_calculator_title: "គណនាប្រាក់ទទួល និងប្រាក់អាប់",
    reset_cash: "កំណត់ឡើងវិញ",
    received_usd: "ប្រាក់ទទួលជាដុល្លារ ($)",
    received_khr: "ប្រាក់ទទួលជារៀល (៛)",
    exact_amount: "គ្រប់ចំនួន",
    usd_notes: "ក្រដាសប្រាក់ដុល្លារ ($)",
    khr_notes: "ក្រដាសប្រាក់រៀល (៛)",
    change_due: "ប្រាក់ត្រូវអាប់ជូនអតិថិជន:",
    give_customer: "ណែនាំរបៀបអាប់ប្រាក់:",
    still_short: "ខ្វះទឹកប្រាក់ចំនួន",
    complete_sale: "បញ្ចប់ការលក់",
    recording_sale: "កំពុងរក្សាទុកវិក្កយបត្រ...",
    print_receipt: "បោះពុម្ពវិក្កយបត្រ",
    next_customer: "អតិថិជនបន្ទាប់",
    cashier_label: "អ្នកគិតលុយ",
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
      // Crisp 2650Hz + 5300Hz dual-oscillator supermarket laser beep (68ms)
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
      // Cheerful double-beep register confirmation (2100Hz -> 2800Hz)
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
      // Low error double-buzz (240Hz) when barcode is not found
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
      return t(`pos.${key}`, dict[key] || POS_DICT.en[key] || key);
    },
    [t, isKm],
  );

  // POS Cart & Product Browsing State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [scrollDirection, setScrollDirection] = useState("vertical"); // "vertical" | "horizontal"
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
  const productScrollRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const safeRate = useMemo(() => {
    const num = Number(exchangeRate);
    return num >= 100 ? num : DEFAULT_EXCHANGE_RATE;
  }, [exchangeRate]);

  const formatKhrWithRate = useCallback(
    (usdAmount) => {
      const khr = Math.round((Number(usdAmount || 0) * safeRate) / 100) * 100;
      return `${khr.toLocaleString()} ៛`;
    },
    [safeRate],
  );

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

  // ALL matching products (No 12-item cutoff! Admin & Cashier can select any product)
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

      if (soundEnabledRef.current) playSupermarketScannerSound("scan");
      try {
        if (navigator.vibrate) navigator.vibrate(40);
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
            fps: 18,
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

    // Smart Mixed Change Breakdown: Whole USD notes + remainder in Riel
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
          isKm
            ? "ប្រាក់ទទួលតិចជាងទឹកប្រាក់សរុប!"
            : "Cash received is less than the bill total!",
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
        wholeUsdChange: totals.wholeUsdChange,
        remainderKhrChange: totals.remainderKhrChange,
      });

      setCart([]);
      setTenderedUsd("");
      setTenderedKhr("");
      triggerToast?.(
        `✅ ${orderId} (${fmt(totals.totalUsd)})`,
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
          /* Hide ugly browser number input arrows */
          .pos-no-spin::-webkit-outer-spin-button,
          .pos-no-spin::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .pos-no-spin {
            -moz-appearance: textfield;
          }

          .pos-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 20px;
            align-items: start;
          }

          /* Vertical Scroll Mode (Up & Down) */
          .pos-product-grid-vertical {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
            gap: 10px;
            max-height: 540px;
            overflow-y: auto;
            padding-right: 4px;
          }

          /* Horizontal Scroll Mode (Left & Right Swipe) */
          .pos-product-grid-horizontal {
            display: grid;
            grid-template-rows: repeat(2, auto);
            grid-auto-flow: column;
            grid-auto-columns: 145px;
            gap: 10px;
            overflow-x: auto;
            padding-bottom: 10px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .pos-product-grid-horizontal > button {
            scroll-snap-align: start;
          }

          .pos-category-chips {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 6px;
            scrollbar-width: none;
          }
          .pos-category-chips::-webkit-scrollbar {
            display: none;
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
              flexShrink: 0,
            }}
          >
            <FiZap size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
              {L("title")}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
              {L("subtitle")}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Clean Exchange Rate Selector (4000 / 4100 + Custom without Accidental Scroll Spinners) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F9FAFB",
              padding: "5px 10px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>{L("rate_label")}</span>
            <input
              type="number"
              step="50"
              className="pos-no-spin"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              style={{
                width: 52,
                border: "1px solid #DBEAFE",
                borderRadius: 6,
                padding: "2px 6px",
                background: "#fff",
                fontWeight: 800,
                color: "#0066FF",
                fontSize: 13,
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

          {/* Supermarket Laser Beep Toggle + Test Sound Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playSupermarketScannerSound("scan");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "10px 0 0 10px",
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
              {soundEnabled ? L("beep_on") : L("muted")}
            </button>
            <button
              type="button"
              onClick={() => playSupermarketScannerSound("scan")}
              title="Test supermarket scanner beep"
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
                <FiCameraOff size={18} /> {L("stop_camera")}
              </>
            ) : (
              <>
                <FiCamera size={18} /> {L("start_camera")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pos-grid">
        {/* LEFT COLUMN: Continuous Camera + All Products Selector (Vertical/Horizontal Switch) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Continuous Phone Camera Viewfinder */}
          {scannerOpen && (
            <div
              onClick={() => {
                lastScanRef.current = { code: "", time: 0 };
                showScanFeedback(L("ready_scan"), false);
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
                  {L("starting_camera")}
                </div>
              )}

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
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span>🟢 {L("continuous_mode")}</span>
                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                  {L("tap_rescan")}
                </span>
              </div>
            </div>
          )}

          {/* Product Catalog Browser (All Products + Category Filter + Scroll Direction Switch) */}
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #f3f4f6",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
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
                placeholder={L("search_placeholder")}
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
                  {L("clear")}
                </button>
              )}
            </div>

            {/* Category Pills + No-Barcode Filter */}
            <div className="pos-category-chips" style={{ marginBottom: 12 }}>
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

            {/* Product Count + Scroll Direction Switcher (Up/Down vs Left/Right) */}
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
                {L("showing_count")} <strong>{filteredProducts.length}</strong>{" "}
                {L("products_unit")}
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
                    padding: "5px 10px",
                    fontSize: 12,
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
                        ? "0 1px 3px rgba(0,0,0,0.1)"
                        : "none",
                  }}
                >
                  <FiArrowDown size={13} /> {L("scroll_vertical")}
                </button>
                <button
                  type="button"
                  onClick={() => setScrollDirection("horizontal")}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 12,
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
                        ? "0 1px 3px rgba(0,0,0,0.1)"
                        : "none",
                  }}
                >
                  <FiArrowRight size={13} /> {L("scroll_horizontal")}
                </button>
              </div>
            </div>

            {/* All Products Grid (Vertical or Horizontal) */}
            <div
              ref={productScrollRef}
              className={
                scrollDirection === "horizontal"
                  ? "pos-product-grid-horizontal"
                  : "pos-product-grid-vertical"
              }
            >
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
                      {formatKhrWithRate(price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Cashier Bill & Upgraded Dual-Currency Cash Calculator */}
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
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FiTrash2 size={13} /> {L("clear")}
              </button>
            )}
          </div>

          {/* Scanned Items List */}
          <div
            style={{
              maxHeight: 250,
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
                  padding: "32px 16px",
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
                      </strong>{" "}
                      <span style={{ fontSize: 11 }}>
                        ({formatKhrWithRate(item.price * item.qty)})
                      </span>
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
              marginBottom: 14,
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
                style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF" }}
              >
                {L("total_due_usd")}
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
                style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}
              >
                {L("total_due_khr")}
              </span>
              <span
                style={{ fontSize: 18, fontWeight: 800, color: "#1D4ED8" }}
              >
                {totals.totalKhr.toLocaleString()} ៛
              </span>
            </div>
          </div>

          {/* Clean Payment Method Toggle (Cash vs ABA KHQR) */}
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
              <FiDollarSign size={16} /> {L("cash_payment")}
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
              <FiSmartphone size={16} /> {L("khqr_payment")}
            </button>
          </div>

          {/* Upgraded Cash Received & Dual-Currency Change Calculator */}
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#374151",
                  }}
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
                      padding: "3px 8px",
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

              {/* Clean USD & KHR Inputs (No Spinner Arrows + Instant Clear Button) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 12,
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
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 800,
                        color: "#059669",
                        fontSize: 14,
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
                        padding: "9px 28px 9px 24px",
                        borderRadius: 10,
                        border: tenderedUsd
                          ? "2px solid #10B981"
                          : "1px solid #D1D5DB",
                        fontSize: 15,
                        fontWeight: 800,
                        boxSizing: "border-box",
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
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "#F3F4F6",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#6B7280",
                        }}
                      >
                        <FiX size={12} />
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
                        padding: "9px 38px 9px 10px",
                        borderRadius: 10,
                        border: tenderedKhr
                          ? "2px solid #0066FF"
                          : "1px solid #D1D5DB",
                        fontSize: 15,
                        fontWeight: 800,
                        boxSizing: "border-box",
                        background: "#fff",
                        outline: "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: tenderedKhr ? 28 : 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 800,
                        color: "#0066FF",
                        fontSize: 14,
                      }}
                    >
                      ៛
                    </span>
                    {tenderedKhr && (
                      <button
                        type="button"
                        onClick={() => setTenderedKhr("")}
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "#F3F4F6",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#6B7280",
                        }}
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: Exact + USD Banknote Buttons ($1, $5, $10, $20, $50, $100) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTenderedUsd(String(totals.totalUsd));
                    setTenderedKhr("");
                  }}
                  style={{
                    padding: "6px 4px",
                    borderRadius: 8,
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
                          Math.round(((parseFloat(prev) || 0) + usdBill) * 100) /
                            100,
                        ),
                      )
                    }
                    style={{
                      padding: "6px 4px",
                      borderRadius: 8,
                      border: "1px solid #A7F3D0",
                      background: "#ECFDF5",
                      color: "#065F46",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    +${usdBill}
                  </button>
                ))}
              </div>

              {/* Row 2: Khmer Riel Banknote Buttons (1k, 5k, 10k, 20k, 50k, 100k) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
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
                      borderRadius: 8,
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

              {/* Change Due Display */}
              {(totals.givenUsd > 0 || totals.givenKhr > 0) && (
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
                          alignItems: "center",
                          fontWeight: 800,
                          color: "#065F46",
                          fontSize: 15,
                        }}
                      >
                        <span>{L("change_due")}</span>
                        <span style={{ fontSize: 16 }}>
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
                            💡 {L("give_customer")}{" "}
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
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{L("still_short")}:</span>
                      <span>
                        {fmt(totals.totalUsd - totals.totalGivenInUsd)} (
                        {(
                          Math.round(
                            ((totals.totalUsd - totals.totalGivenInUsd) *
                              safeRate) /
                              100,
                          ) * 100
                        ).toLocaleString()}{" "}
                        ៛)
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
              padding: "14px",
              fontSize: 16,
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
                #{completedReceipt.id} • {completedReceipt.date}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                {L("cashier_label")}: {completedReceipt.cashier}
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
                <FiPrinter size={16} /> {L("print_receipt")}
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
                <FiRefreshCw size={16} /> {L("next_customer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
