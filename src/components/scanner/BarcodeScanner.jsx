import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { FiX, FiLoader, FiCameraOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// --- CONFIGURATION ---
const SCANNER_CONFIG = {
  fps: 15,
  qrbox: 250,
  formats: [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
};

let cameraOperationChain = Promise.resolve();

// --- HELPERS ---
const safeClear = (scanner) => {
  try {
    scanner.clear();
  } catch (e) {
    // Silently ignore teardown errors
  }
};

const playBeepSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    console.error("Audio feedback error:", err);
  }
};

// --- MAIN COMPONENT ---
const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const { t } = useTranslation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lock body scroll
  useEffect(() => {
    const { overflow, position, width } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.width = width;
    };
  }, []);

  // Camera Initialization Logic
  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;

    const html5QrCode = new Html5Qrcode("reader", { verbose: false });
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      const cameraConfig = { facingMode: "environment" };
      if (cancelled) return;

      await html5QrCode.start(
        cameraConfig,
        {
          fps: SCANNER_CONFIG.fps,
          qrbox: SCANNER_CONFIG.qrbox,
          disableFlip: true,
          formatsToSupport: SCANNER_CONFIG.formats,
        },
        (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          setIsProcessing(true);

          playBeepSound();
          if (navigator.vibrate) navigator.vibrate(200);

          html5QrCode
            .stop()
            .then(() => safeClear(html5QrCode))
            .catch(() => {})
            .finally(() => {
              if (isMountedRef.current && onScanSuccessRef.current) {
                onScanSuccessRef.current(decodedText);
              }
            });
        },
        () => {}, // Ignore read errors
      );
    };

    cameraOperationChain = cameraOperationChain
      .catch(() => {})
      .then(async () => {
        if (!cancelled) await startScanner();
      })
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        if (isMountedRef.current && !cancelled) {
          setHasError(true);
          setErrorType(err?.name || "GenericError");
        }
      });

    return () => {
      isMountedRef.current = false;
      cancelled = true;
      cameraOperationChain = cameraOperationChain
        .catch(() => {})
        .then(async () => {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop().catch(() => {});
          }
          safeClear(html5QrCode);
        });
    };
  }, []);

  // --- RENDER HELPERS ---
  const getErrorMessage = () => {
    const errors = {
      NotAllowedError: t(
        "scanner.error_permission",
        "Camera permission was denied. Please allow camera access in your browser settings.",
      ),
      NotFoundError: t(
        "scanner.error_no_camera",
        "No camera hardware found on this device.",
      ),
      OverconstrainedError: t(
        "scanner.error_generic",
        "Your device does not support the requested camera settings.",
      ),
    };
    return (
      errors[errorType] ||
      t(
        "scanner.error_generic",
        "Could not access camera. Please check your browser permissions.",
      )
    );
  };

  const renderStatusOverlay = () => (
    <div style={styles.statusOverlay}>
      {isProcessing ? (
        <>
          <div style={styles.loaderIconWrapper}>
            <FiLoader size={40} style={styles.loaderIcon} />
          </div>
          <p style={styles.statusText}>
            {t("scanner.loading", "Loading product...")}
          </p>
        </>
      ) : (
        <>
          <div style={styles.errorIconWrapper}>
            <FiCameraOff size={40} style={{ color: "#ef4444" }} />
          </div>
          <p style={styles.errorTitle}>
            {t("scanner.camera_blocked", "Camera Access Blocked")}
          </p>
          <p style={styles.errorSubtitle}>{getErrorMessage()}</p>
          <button onClick={onClose} style={styles.closeButton}>
            {t("scanner.close", "Close Scanner")}
          </button>
        </>
      )}
    </div>
  );

  const modalContent = (
    <div style={styles.container}>
      <style>{CSS_STYLES}</style>

      {/* 1. Hardware Camera Output */}
      <div id="reader"></div>

      {/* 2. Target Box Overlay */}
      <div style={styles.targetOverlay}>
        <div className="scanner-cutout">
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>
        <p style={styles.instructionText}>Point camera at a barcode to scan</p>
      </div>

      {/* 3. Navigation Header */}
      <div className="scanner-header-wrapper">
        <h2 style={styles.logo}>
          SOPHEA <span style={{ color: "#3b82f6" }}>MART</span>
        </h2>
        <button
          onClick={onClose}
          className="header-close-btn"
          aria-label="Close"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* 4. Loading / Error Screen */}
      {(isProcessing || hasError) && renderStatusOverlay()}
    </div>
  );

  return createPortal(modalContent, document.body);
};

// --- STYLES ---
const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    backgroundColor: "#000000",
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
    color: "white",
    marginTop: "32px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 10,
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
  },
  logo: {
    color: "white",
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
  statusText: {
    color: "white",
    fontSize: "18px",
    margin: 0,
    fontWeight: "600",
  },
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
    backgroundColor: "#ffffff",
    color: "#000000",
    borderRadius: "12px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontSize: "15px",
    transition: "transform 0.1s",
  },
};

const CSS_STYLES = `
  #reader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; }
  #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
  #reader > *:not(video) { display: none !important; }
  .scanner-cutout { position: relative; width: 250px; height: 250px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); border-radius: 20px; }
  .corner { position: absolute; width: 40px; height: 40px; border-color: #3b82f6; border-style: solid; }
  .corner-tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 20px; }
  .corner-tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 20px; }
  .corner-bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 20px; }
  .corner-br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 20px; }
  .scanner-header-wrapper { position: absolute; top: 0; left: 0; width: 100%; padding: 20px 24px; padding-top: 48px; display: flex; justify-content: space-between; align-items: center; z-index: 10; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); }
  .header-close-btn { padding: 8px; background: rgba(255,255,255,0.1); color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; transition: background 0.2s; backdrop-filter: blur(4px); }
  .header-close-btn:active { background: rgba(255,255,255,0.2); transform: scale(0.95); }
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default BarcodeScanner;
