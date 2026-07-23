import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { FiX, FiLoader, FiCameraOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Global promise chain prevents race conditions if the user opens/closes rapidly
let cameraOperationChain = Promise.resolve();

const safeClear = (scanner) => {
  try {
    scanner.clear();
  } catch (e) {
    // Silently ignore teardown errors
  }
};

const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const { t } = useTranslation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const isMountedRef = useRef(true);

  // Keep the success callback reference updated
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lock scrolling on the main page while scanner is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = "";
    };
  }, []);

  // Main Camera Logic
  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;

    // Initialize Scanner (verbose: false keeps the console clean)
    const html5QrCode = new Html5Qrcode("reader", { verbose: false });
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      // 🏆 BUG FIX: Removed 'advanced' focusMode and specific resolutions.
      // This guarantees the camera will open on iOS Safari and strict Android browsers
      // without throwing an OverconstrainedError.
      const cameraConfig = { facingMode: "environment" };

      if (cancelled) return;

      // 2. Optimized Single Start Call
      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: 250,
          disableFlip: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        },
        (decodedText) => {
          // Success Handler
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          setIsProcessing(true);

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
        () => {}, // Ignore continuous frame-by-frame read errors
      );
    };

    // Chain the start operation
    cameraOperationChain = cameraOperationChain
      .catch(() => {})
      .then(async () => {
        if (!cancelled) {
          await startScanner();
        }
      })
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        if (isMountedRef.current && !cancelled) {
          setHasError(true);
          setErrorType(err?.name || "GenericError");
        }
      });

    // Cleanup operation
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

  const getErrorMessage = () => {
    if (errorType === "NotAllowedError")
      return t(
        "scanner.error_permission",
        "Camera permission was denied. Please allow camera access in your browser settings.",
      );
    if (errorType === "NotFoundError")
      return t(
        "scanner.error_no_camera",
        "No camera hardware found on this device.",
      );
    // Added specific text so you know if it's an OverconstrainedError in the future
    if (errorType === "OverconstrainedError")
      return t(
        "scanner.error_generic",
        "Your device does not support the requested camera settings.",
      );

    return t(
      "scanner.error_generic",
      "Could not access camera. Please check your browser permissions.",
    );
  };

  const modalContent = (
    <div
      style={{
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
      }}
    >
      <style>{`
        #reader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; }
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
        #reader > *:not(video) { display: none !important; }
        /* The UI target box is 250px, which matches the qrbox config above! */
        .scanner-cutout { position: relative; width: 250px; height: 250px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); border-radius: 20px; }
        .corner { position: absolute; width: 40px; height: 40px; border-color: #3b82f6; border-style: solid; }
        .corner-tl { top: -2px; left: -2px; border-width: 4px 0 0 4px; border-top-left-radius: 20px; }
        .corner-tr { top: -2px; right: -2px; border-width: 4px 4px 0 0; border-top-right-radius: 20px; }
        .corner-bl { bottom: -2px; left: -2px; border-width: 0 0 4px 4px; border-bottom-left-radius: 20px; }
        .corner-br { bottom: -2px; right: -2px; border-width: 0 4px 4px 0; border-bottom-right-radius: 20px; }
        .scanner-header-wrapper { position: absolute; top: 0; left: 0; width: 100%; padding: 20px 24px; padding-top: 48px; display: flex; justify-content: space-between; align-items: center; z-index: 10; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); }
        .close-btn { padding: 8px; background: rgba(255,255,255,0.1); color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; transition: background 0.2s; backdrop-filter: blur(4px); }
        .close-btn:active { background: rgba(255,255,255,0.2); transform: scale(0.95); }
      `}</style>

      {/* Camera Feed */}
      <div id="reader"></div>

      {/* Target UI Overlay */}
      <div
        style={{
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
        }}
      >
        <div className="scanner-cutout">
          <div className="corner corner-tl"></div>
          <div className="corner corner-tr"></div>
          <div className="corner corner-bl"></div>
          <div className="corner corner-br"></div>
        </div>
        <p
          style={{
            color: "white",
            marginTop: "32px",
            fontSize: "14px",
            fontWeight: "500",
            zIndex: 10,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          Point camera at a barcode to scan
        </p>
      </div>

      {/* Header */}
      <div className="scanner-header-wrapper">
        <h2
          style={{
            color: "white",
            fontWeight: 800,
            fontSize: "18px",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          SOPHEA <span style={{ color: "#3b82f6" }}>MART</span>
        </h2>
        <button onClick={onClose} className="close-btn" aria-label="Close">
          <FiX size={24} />
        </button>
      </div>

      {/* Loading / Error States */}
      {(isProcessing || hasError) && (
        <div
          style={{
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
          }}
        >
          {isProcessing ? (
            <>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  borderRadius: "50%",
                  marginBottom: "16px",
                }}
              >
                <FiLoader
                  size={40}
                  style={{
                    color: "#3b82f6",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
              <p
                style={{
                  color: "white",
                  fontSize: "18px",
                  margin: 0,
                  fontWeight: "600",
                }}
              >
                {t("scanner.loading", "Loading product...")}
              </p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  borderRadius: "50%",
                  marginBottom: "20px",
                }}
              >
                <FiCameraOff size={40} style={{ color: "#ef4444" }} />
              </div>
              <p
                style={{
                  color: "#f87171",
                  fontWeight: "bold",
                  fontSize: "20px",
                  margin: "0 0 12px 0",
                }}
              >
                {t("scanner.camera_blocked", "Camera Access Blocked")}
              </p>
              <p
                style={{
                  color: "#d1d5db",
                  fontSize: "14px",
                  marginBottom: "32px",
                  maxWidth: "300px",
                  lineHeight: 1.5,
                }}
              >
                {getErrorMessage()}
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: "14px 40px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  transition: "transform 0.1s",
                }}
              >
                {t("scanner.close", "Close Scanner")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BarcodeScanner;
