import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode } from "html5-qrcode";
import { FiX, FiLoader } from "react-icons/fi";

// Module-level lock (not component state) — survives React StrictMode's
// double-invoke of effects in development, so two getUserMedia() calls
// never fire at the same instant and race each other.
let cameraOperationChain = Promise.resolve();

// html5-qrcode's clear() is SYNCHRONOUS (no Promise returned), unlike
// stop() which is async. Calling .catch() on clear()'s return value
// throws "Cannot read properties of undefined (reading 'catch')".
// This helper safely handles that.
const safeClear = (scanner) => {
  try {
    scanner.clear();
  } catch (e) {
    // ignore — element may already be torn down
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

  // Keep the latest callback without restarting the camera effect
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Lock background scroll while the scanner is open (prevents iOS Safari's
  // rubber-band scroll from shifting the "fixed" overlay)
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

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    const html5QrCode = new Html5Qrcode("reader", { verbose: false });
    scannerRef.current = html5QrCode;

    // Scan box sized relative to the actual viewfinder, not a fixed pixel
    // value — keeps the overlay aligned regardless of screen/camera size
    const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const boxSize = Math.floor(minEdge * 0.7);
      return { width: boxSize, height: Math.floor(boxSize * 0.6) };
    };

    const startScanner = async () => {
      let cameraConfig = { facingMode: "environment" };
      try {
        const cameras = await Html5Qrcode.getCameras();
        const backCamera = cameras.find((c) =>
          /back|rear|environment/i.test(c.label),
        );
        if (backCamera) {
          cameraConfig = { deviceId: { exact: backCamera.id } };
        } else if (cameras.length > 0) {
          // Desktop/laptop fallback — no rear camera exists
          cameraConfig = { deviceId: { exact: cameras[0].id } };
        }
      } catch (e) {
        // getCameras() can fail before permission is granted on some
        // browsers — fall back to facingMode and let start() prompt
      }

      if (cancelled) return;

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: qrboxFunction,
          aspectRatio: 1.777778, // 16:9 — matches most rear cameras (iOS + Android)
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
        () => {
          // Ignore per-frame "no barcode found" noise — fires ~10x/sec
        },
      );

      // If cleanup already ran while start() was still in flight
      // (StrictMode's first pass), stop this session immediately
      if (cancelled) {
        await html5QrCode.stop().catch(() => {});
        safeClear(html5QrCode);
      }
    };

    // Chain onto the shared lock so overlapping start attempts run in
    // strict sequence instead of firing getUserMedia() simultaneously
    cameraOperationChain = cameraOperationChain
      .catch(() => {})
      .then(startScanner)
      .catch((err) => {
        console.error("Failed to start scanner:", err);
        if (isMountedRef.current && !cancelled) {
          setHasError(true);
          if (err?.name === "NotAllowedError") {
            setErrorMessage(
              "Camera access was denied. Please allow camera permission in your browser settings.",
            );
          } else if (err?.name === "NotFoundError") {
            setErrorMessage("No camera was found on this device.");
          } else if (err?.name === "NotReadableError") {
            setErrorMessage("Camera is already in use by another app or tab.");
          } else {
            setErrorMessage(
              "Please allow camera permissions in your browser to scan products.",
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
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      {/* Forces html5-qrcode's internally-injected <video> to fill and
          center inside our container instead of using its own
          native-resolution inline sizing — this is what fixes the
          "camera looks offset / hidden" layout bug on phones */}
      <style>{`
        #reader {
          position: relative;
          width: 100%;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px;
          display: block;
        }
        #reader__scan_region {
          position: absolute !important;
          inset: 0 !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #reader__scan_region > img { display: none !important; }
        #reader__dashboard { display: none !important; }
      `}</style>

      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close scanner"
        >
          <FiX size={24} />
        </button>
      </div>

      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 text-white">
          <FiLoader size={48} className="animate-spin text-blue-500" />
          <p className="font-medium text-lg">Loading product...</p>
        </div>
      ) : hasError ? (
        <div className="text-center px-6">
          <p className="text-red-400 font-bold mb-2 text-lg">Camera Error</p>
          <p className="text-gray-400 text-sm mb-6">{errorMessage}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-black rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm px-6">
          {/* Fixed aspect ratio — container never resizes after the video
              attaches, so the scan overlay stays aligned with what you see */}
          <div
            id="reader"
            className="w-full aspect-[4/3] rounded-[24px] overflow-hidden border-4 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-gray-900"
          ></div>
          <p className="text-gray-400 text-center mt-6 text-sm">
            Point your camera directly at the product barcode sticker.
          </p>
        </div>
      )}
    </div>
  );

  // Portal straight to <body> — bypasses whatever parent renders this
  // component, so no parent layout, transform, or overflow rule can ever
  // affect its position
  return createPortal(modalContent, document.body);
};

export default BarcodeScanner;
