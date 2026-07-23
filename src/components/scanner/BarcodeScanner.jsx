import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode } from "html5-qrcode";
import { FiX, FiLoader, FiCameraOff } from "react-icons/fi";

let cameraOperationChain = Promise.resolve();

const safeClear = (scanner) => {
  try {
    scanner.clear();
  } catch (e) {
    // ignore teardown errors
  }
};

const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lock background scroll when modal is open
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

  const startScanner = async (html5QrCode) => {
    let cameraConfig = { facingMode: "environment" };
    try {
      const cameras = await Html5Qrcode.getCameras();
      const backCamera = cameras.find((c) =>
        /back|rear|environment/i.test(c.label),
      );
      if (backCamera) {
        cameraConfig = { deviceId: { exact: backCamera.id } };
      } else if (cameras.length > 0) {
        cameraConfig = { deviceId: { exact: cameras[0].id } };
      }
    } catch (e) {
      // Fallback to facingMode if permissions aren't granted yet
    }

    await html5QrCode.start(
      cameraConfig,
      {
        fps: 15,
        // 🏆 REMOVED `qrbox` configuration.
        // The library will no longer generate its own ugly UI elements.
        // It will scan the whole screen, making detection much faster.
      },
      (decodedText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);

        if (navigator.vibrate) navigator.vibrate(200);

        html5QrCode
          .stop()
          .then(() => {
            safeClear(html5QrCode);
          })
          .catch(() => {})
          .finally(() => {
            if (isMountedRef.current && onScanSuccessRef.current) {
              onScanSuccessRef.current(decodedText);
            }
          });
      },
      () => {},
    );
  };

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    const html5QrCode = new Html5Qrcode("reader", { verbose: false });
    scannerRef.current = html5QrCode;

    cameraOperationChain = cameraOperationChain
      .catch(() => {})
      .then(async () => {
        if (!cancelled) {
          await startScanner(html5QrCode);
        }
      })
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        if (isMountedRef.current && !cancelled) {
          setHasError(true);
          if (err?.name === "NotAllowedError") {
            setErrorMessage(
              "Camera permission was denied. Please allow camera access in your browser settings.",
            );
          } else if (err?.name === "NotFoundError") {
            setErrorMessage("No camera hardware found on this device.");
          } else {
            setErrorMessage(
              "Could not access camera. Please check your browser permissions.",
            );
          }
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
        /* Force raw video feed to cover the entire viewport cleanly */
        #reader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000000; }
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
        
        /* Ensure no stray library elements ever render */
        #reader > *:not(video) { display: none !important; }
        
        /* 🏆 ABA-Style Cutout frame */
        .scanner-cutout {
          position: relative;
          width: 250px;
          height: 250px;
          /* Softer, more transparent shadow to match ABA */
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
          border-radius: 20px;
        }
        @media (min-width: 640px) {
          .scanner-cutout { width: 300px; height: 300px; }
        }
        
        /* 🏆 Refined, Thinner White Brackets */
        .corner { position: absolute; width: 40px; height: 40px; border-color: #ffffff; border-style: solid; }
        .corner-tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-top-left-radius: 20px; }
        .corner-tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-top-right-radius: 20px; }
        .corner-bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-bottom-left-radius: 20px; }
        .corner-br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-bottom-right-radius: 20px; }

        /* Header Navigation */
        .scanner-header-wrapper {
          position: absolute; top: 0; left: 0; width: 100%; padding: 20px 24px; padding-top: 48px;
          display: flex; justify-content: space-between; align-items: center; z-index: 10;
          box-sizing: border-box;
        }
        
        /* Clean invisible close button area */
        .close-btn {
          padding: 8px; background: transparent;
          color: white; border-radius: 50%; border: none; cursor: pointer; display: flex;
          transition: background 0.2s;
        }
      `}</style>

      {/* Full-Screen Camera Video Feed */}
      <div id="reader"></div>

      {/* Pure Visual Guide (No functional restrictions) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          display: "flex",
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
      </div>

      {/* Top Bar */}
      <div className="scanner-header-wrapper">
        <h2
          style={{
            color: "white",
            fontWeight: 700,
            fontSize: "18px",
            margin: 0,
            letterSpacing: "0.5px",
          }}
        >
          SOPHEA <span style={{ color: "#3b82f6" }}>MART</span>
        </h2>
        <button onClick={onClose} className="close-btn" aria-label="Close">
          <FiX size={28} />
        </button>
      </div>

      {/* Loading & Error Overlays */}
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
            padding: "24px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {isProcessing ? (
            <>
              <FiLoader
                size={48}
                style={{
                  color: "#3b82f6",
                  marginBottom: "16px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p
                style={{
                  color: "white",
                  fontSize: "18px",
                  margin: 0,
                  fontWeight: "600",
                }}
              >
                Loading product...
              </p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <FiCameraOff
                size={52}
                style={{ color: "#ef4444", marginBottom: "16px" }}
              />
              <p
                style={{
                  color: "#f87171",
                  fontWeight: "bold",
                  fontSize: "20px",
                  margin: "0 0 8px 0",
                }}
              >
                Camera Access Blocked
              </p>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "14px",
                  marginBottom: "28px",
                  maxWidth: "320px",
                  lineHeight: 1.5,
                }}
              >
                {errorMessage}
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: "14px 36px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  borderRadius: "999px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                Close Scanner
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
