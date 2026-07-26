import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { FiX, FiLoader, FiCameraOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const SCANNER_CONFIG = {
  fps: 30,
  qrbox: { width: 300, height: 140 },
  formatsToSupport: [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
};

// --- Audio Engine ---
let globalAudioCtx = null;
let isAudioUnlocked = false;

const unlockAudioEngine = () => {
  if (isAudioUnlocked) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    globalAudioCtx = globalAudioCtx || new AudioContext();
    if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();

    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.01);

    isAudioUnlocked = true;
  } catch (err) {}
};

const playBeepSound = () => {
  try {
    if (!globalAudioCtx || globalAudioCtx.state === "suspended")
      unlockAudioEngine();
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);

    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.1);
  } catch (err) {}
};

// --- Camera Hardware Helpers ---
const getBackCameraId = async () => {
  // 1. WebRTC Bypass: Force OS to reveal the actual hardware ID
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
    });
    const track = stream.getVideoTracks()[0];
    const deviceId = track.getSettings().deviceId;
    stream.getTracks().forEach((t) => t.stop());
    if (deviceId) return deviceId;
  } catch (err) {
    // Ignore and fallback to list
  }

  // 2. Failsafe: Search device list
  const devices = await Html5Qrcode.getCameras();
  if (!devices || devices.length === 0) return null;

  const backCameras = devices.filter((c) =>
    /back|rear|environment/i.test(c.label),
  );

  return backCameras.length > 0
    ? backCameras[backCameras.length - 1].id
    : devices[devices.length - 1].id;
};

const stopScannerSafe = async (scanner) => {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch (err) {}
};

// --- Main Component ---
const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const { t } = useTranslation();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Lock body scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    unlockAudioEngine();
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Initialize Scanner
  useEffect(() => {
    isMountedRef.current = true;

    const initScanner = async () => {
      await new Promise((r) => setTimeout(r, 100)); // Brief delay for smooth UI mount
      if (!isMountedRef.current) return;

      const scanner = new Html5Qrcode("reader", {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      const handleScan = (decodedText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);

        playBeepSound();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        stopScannerSafe(scannerRef.current).finally(() => {
          if (isMountedRef.current) onScanSuccess(decodedText);
        });
      };

      try {
        const cameraId = await getBackCameraId();
        if (!cameraId) throw new Error("No cameras found");

        const config = {
          ...SCANNER_CONFIG,
          disableFlip: true,
        };

        await scanner.start(cameraId, config, handleScan, () => {});
      } catch (err) {
        if (isMountedRef.current) {
          setHasError(true);
          setErrorType(err?.name || "GenericError");
        }
      } finally {
        if (isMountedRef.current) setIsInitializing(false);
      }
    };

    initScanner();

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        stopScannerSafe(scannerRef.current).then(() => {
          try {
            scannerRef.current.clear();
          } catch (e) {}
        });
      }
    };
  }, [onScanSuccess]);

  // --- Render Helpers ---
  const getErrorMessage = () => {
    const errors = {
      NotAllowedError: t(
        "scanner.error_permission",
        "Camera permission was denied.",
      ),
      NotFoundError: t("scanner.error_no_camera", "No camera hardware found."),
      OverconstrainedError: t(
        "scanner.error_no_back_camera",
        "Could not access the back camera.",
      ),
    };
    return (
      errors[errorType] ||
      t("scanner.error_generic", "Could not access camera.")
    );
  };

  const renderStatusOverlay = () => {
    if (!isProcessing && !isInitializing && !hasError) return null;

    let content;
    if (hasError) {
      content = (
        <>
          <div style={styles.errorIconWrapper}>
            <FiCameraOff size={40} color="#ef4444" />
          </div>
          <p style={styles.errorTitle}>
            {t("scanner.camera_blocked", "Camera Access Blocked")}
          </p>
          <p style={styles.errorSubtitle}>{getErrorMessage()}</p>
          <button onClick={onClose} style={styles.closeButton}>
            {t("scanner.close", "Close Scanner")}
          </button>
        </>
      );
    } else {
      const text = isProcessing
        ? t("scanner.loading", "Loading product...")
        : t("scanner.starting", "Starting camera...");
      content = (
        <>
          <div style={styles.loaderIconWrapper}>
            <FiLoader size={40} style={styles.loaderIcon} />
          </div>
          <p style={styles.statusText}>{text}</p>
        </>
      );
    }

    return <div style={styles.statusOverlay}>{content}</div>;
  };

  return createPortal(
    <div
      style={styles.container}
      onClick={unlockAudioEngine}
      onTouchStart={unlockAudioEngine}
    >
      <style>{CSS_STYLES}</style>

      <div id="reader"></div>

      <div style={styles.targetOverlay}>
        <div className="scanner-cutout">
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>
        <p style={styles.instructionText}>
          {t("scanner.instruction", "Point camera at a barcode to scan")}
        </p>
      </div>

      <div className="scanner-header-wrapper">
        <h2 style={styles.logo}>
          SOPHEA <span style={{ color: "#3b82f6" }}>MART</span>
        </h2>
        <button
          onClick={onClose}
          className="header-icon-btn"
          aria-label="Close"
        >
          <FiX size={24} />
        </button>
      </div>

      {renderStatusOverlay()}
    </div>,
    document.body,
  );
};

// --- Styles ---
const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    backgroundColor: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  targetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    color: "#fff",
    marginTop: "32px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 10,
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
  },
  logo: {
    color: "#fff",
    fontWeight: 800,
    fontSize: "18px",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(4px)",
    padding: "24px",
    textAlign: "center",
    boxSizing: "border-box",
  },
  loaderIconWrapper: {
    padding: "16px",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: "50%",
    marginBottom: "16px",
  },
  loaderIcon: { color: "#3b82f6", animation: "spin 1s linear infinite" },
  statusText: { color: "#fff", fontSize: "18px", margin: 0, fontWeight: "600" },
  errorIconWrapper: {
    padding: "20px",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: "50%",
    marginBottom: "20px",
  },
  errorTitle: {
    color: "#f87171",
    fontWeight: "bold",
    fontSize: "20px",
    margin: "0 0 12px 0",
  },
  errorSubtitle: {
    color: "#d1d5db",
    fontSize: "14px",
    marginBottom: "32px",
    maxWidth: "300px",
    lineHeight: 1.5,
  },
  closeButton: {
    padding: "14px 40px",
    backgroundColor: "#fff",
    color: "#000",
    borderRadius: "12px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontSize: "15px",
    transition: "transform 0.1s",
  },
};

const CSS_STYLES = `
  #reader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
  #reader > *:not(video) { display: none !important; }
  
  .scanner-cutout { position: relative; width: 300px; height: 140px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); border-radius: 20px; }
  
  .corner { position: absolute; width: 40px; height: 40px; border-color: #3b82f6; border-style: solid; }
  .corner-tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 20px; }
  .corner-tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 20px; }
  .corner-bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 20px; }
  .corner-br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 20px; }
  
  .scanner-header-wrapper { position: absolute; top: 0; left: 0; width: 100%; padding: 48px 24px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); }
  
  .header-icon-btn { padding: 10px; background: rgba(255,255,255,0.15); color: #fff; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; backdrop-filter: blur(4px); }
  .header-icon-btn:active { background: rgba(255,255,255,0.25); transform: scale(0.95); }
  
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default BarcodeScanner;
