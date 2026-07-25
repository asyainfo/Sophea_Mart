import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  FiX,
  FiLoader,
  FiCameraOff,
  FiZoomIn,
  FiZoomOut,
  FiRefreshCcw,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

const SCANNER_CONFIG = {
  fps: 20,
  qrbox: { width: 320, height: 150 },
  formats: [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
};

let cameraOperationChain = Promise.resolve();
let globalAudioCtx = null;

const safeClear = (scanner) => {
  if (!scanner) return;
  try {
    scanner.clear();
  } catch (e) {}
};

const playBeepSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContext();
    }

    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }

    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, globalAudioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, globalAudioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);

    oscillator.start();
    oscillator.stop(globalAudioCtx.currentTime + 0.12);
  } catch (err) {
    console.warn("Audio feedback skipped:", err);
  }
};

const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const { t } = useTranslation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3, step: 0.1 });

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const toggleCamera = () => {
    if (isProcessing) return;
    setHasError(false);
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setZoom(1);
  };

  const applyHardwareSettings = async (zoomValue) => {
    const videoElement = document.querySelector("#reader video");
    if (!videoElement) return;

    videoElement.style.transform = `scale(${zoomValue})`;
    videoElement.style.transformOrigin = "center center";

    try {
      if (videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities();
          const constraintsToApply = {};

          if (caps.zoom) constraintsToApply.zoom = zoomValue;

          if (caps.focusMode && caps.focusMode.includes("continuous")) {
            constraintsToApply.focusMode = "continuous";
          }

          if (Object.keys(constraintsToApply).length > 0) {
            await track.applyConstraints({ advanced: [constraintsToApply] });
          }
        }
      }
    } catch (err) {}
  };

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    applyHardwareSettings(newZoom);
  };

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    let html5QrCode = null; // 🏆 FIX: Instantiated locally to prevent memory leaks
    let zoomCheckTimeout = null;

    const startScanner = async () => {
      if (cancelled) return;

      // 🏆 FIX: Safe initialization inside the promise chain
      html5QrCode = new Html5Qrcode("reader", {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: SCANNER_CONFIG.fps,
        qrbox: SCANNER_CONFIG.qrbox,
        disableFlip: facingMode === "environment",
        videoConstraints: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const handleScan = (decodedText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);

        playBeepSound();
        if (navigator.vibrate) navigator.vibrate(200);

        try {
          html5QrCode
            .stop()
            .then(() => safeClear(html5QrCode))
            .catch(() => {})
            .finally(() => {
              if (isMountedRef.current && onScanSuccessRef.current) {
                onScanSuccessRef.current(decodedText);
              }
            });
        } catch (e) {
          if (isMountedRef.current && onScanSuccessRef.current) {
            onScanSuccessRef.current(decodedText);
          }
        }
      };

      try {
        await html5QrCode.start(
          { facingMode: { exact: facingMode } },
          config,
          handleScan,
          () => {},
        );
      } catch (err1) {
        if (cancelled) return;
        try {
          await html5QrCode.start(
            { facingMode: facingMode },
            config,
            handleScan,
            () => {},
          );
        } catch (err2) {
          if (cancelled) return;
          await html5QrCode.start(
            { facingMode: "environment" },
            { ...config, videoConstraints: undefined },
            handleScan,
            () => {},
          );
        }
      }

      // 🏆 FIX: Clean up timeout to prevent unmounted state updates on fast camera swaps
      zoomCheckTimeout = setTimeout(() => {
        if (!isMountedRef.current || cancelled) return;
        try {
          const videoElement = document.querySelector("#reader video");
          if (videoElement && videoElement.srcObject) {
            const track = videoElement.srcObject.getVideoTracks()[0];
            if (track.getCapabilities) {
              const caps = track.getCapabilities();

              if (caps.focusMode && caps.focusMode.includes("continuous")) {
                track
                  .applyConstraints({ advanced: [{ focusMode: "continuous" }] })
                  .catch(() => {});
              }

              if (caps.zoom && caps.zoom.max > 3) {
                setZoomRange((prev) => ({ ...prev, max: caps.zoom.max }));
              }
            }
          }
        } catch (err) {}
      }, 500);
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
      if (zoomCheckTimeout) clearTimeout(zoomCheckTimeout);

      cameraOperationChain = cameraOperationChain
        .catch(() => {})
        .then(async () => {
          if (html5QrCode) {
            try {
              await html5QrCode.stop();
            } catch (e) {}
            safeClear(html5QrCode);
          }
        });
    };
  }, [facingMode]);

  // --- RENDER HELPERS ---
  const getErrorMessage = () => {
    const errors = {
      NotAllowedError: t(
        "scanner.error_permission",
        "Camera permission was denied.",
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
      t("scanner.error_generic", "Could not access camera.")
    );
  };

  const renderZoomControl = () => {
    if (isProcessing || hasError) return null;

    return (
      <div className="zoom-slider-container">
        <FiZoomOut size={20} color="white" style={{ opacity: 0.8 }} />
        <input
          type="range"
          min={zoomRange.min}
          max={zoomRange.max}
          step={zoomRange.step}
          value={zoom}
          onChange={handleZoomChange}
          className="zoom-slider"
        />
        <FiZoomIn size={20} color="white" style={{ opacity: 0.8 }} />
      </div>
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
      <div id="reader"></div>
      <div style={styles.targetOverlay}>
        <div className="scanner-cutout">
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>
        <p style={styles.instructionText}>Point camera at a barcode to scan</p>
      </div>

      {renderZoomControl()}

      <div className="scanner-header-wrapper">
        <h2 style={styles.logo}>
          SOPHEA <span style={{ color: "#3b82f6" }}>MART</span>
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={toggleCamera}
            className="header-icon-btn"
            aria-label="Switch Camera"
          >
            <FiRefreshCcw size={20} />
          </button>
          <button
            onClick={onClose}
            className="header-icon-btn"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>
      </div>

      {(isProcessing || hasError) && renderStatusOverlay()}
    </div>
  );

  return createPortal(modalContent, document.body);
};

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
  #reader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; overflow: hidden; }
  #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; transition: transform 0.1s ease-out; }
  #reader > *:not(video) { display: none !important; }
  
  .scanner-cutout { position: relative; width: 320px; height: 150px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); border-radius: 20px; }
  
  .corner { position: absolute; width: 40px; height: 40px; border-color: #3b82f6; border-style: solid; }
  .corner-tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 20px; }
  .corner-tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 20px; }
  .corner-bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 20px; }
  .corner-br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 20px; }
  .scanner-header-wrapper { position: absolute; top: 0; left: 0; width: 100%; padding: 20px 24px; padding-top: 48px; display: flex; justify-content: space-between; align-items: center; z-index: 10; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); }
  
  .header-icon-btn { padding: 10px; background: rgba(255,255,255,0.15); color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; backdrop-filter: blur(4px); }
  .header-icon-btn:active { background: rgba(255,255,255,0.25); transform: scale(0.95); }
  
  .zoom-slider-container {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    width: 85%;
    max-width: 320px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.65);
    padding: 10px 20px;
    border-radius: 999px;
    z-index: 30;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.15);
    pointer-events: auto;
  }
  .zoom-slider {
    flex: 1;
    accent-color: #3b82f6;
    cursor: pointer;
  }

  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

export default BarcodeScanner;
