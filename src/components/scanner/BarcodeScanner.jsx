import { useEffect, useState } from "react";
// 🏆 Notice we are importing Html5Qrcode (the raw camera API), NOT Html5QrcodeScanner
import { Html5Qrcode } from "html5-qrcode";
import { FiX, FiLoader } from "react-icons/fi";

const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 🏆 Initialize the headless scanner. No ugly default UI!
    const html5QrCode = new Html5Qrcode("reader");

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Forces the back camera on smartphones
          {
            fps: 10,
            qrbox: { width: 250, height: 150 }, // Standard barcode shape
          },
          (decodedText) => {
            // What happens on a successful scan
            if (isProcessing) return;
            setIsProcessing(true);

            // Trigger physical phone vibration
            if (navigator.vibrate) navigator.vibrate(200);

            // Stop the camera, then run the success function (redirect or search)
            html5QrCode
              .stop()
              .then(() => {
                if (onScanSuccess) {
                  onScanSuccess(decodedText);
                }
              })
              .catch(console.error);
          },
          (errorMessage) => {
            // We ignore parse errors here. The scanner runs 10 times a second and
            // will throw an error every frame it DOESN'T see a barcode.
          },
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        setHasError(true);
      }
    };

    startScanner();

    // 🏆 Cleanup function: Safely turns off the camera when you close the modal
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScanSuccess, isProcessing]);

  return (
    // 🏆 Strict Full-Screen Dark Overlay with High Z-Index
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 text-white">
          <FiLoader size={48} className="animate-spin text-blue-500" />
          <p className="font-medium text-lg">Loading product...</p>
        </div>
      ) : hasError ? (
        <div className="text-center px-6">
          <p className="text-red-400 font-bold mb-2 text-lg">Camera Error</p>
          <p className="text-gray-400 text-sm mb-6">
            Please allow camera permissions in your browser to scan products.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-black rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm px-6">
          {/* 🏆 Clean Camera Feed Container */}
          <div
            id="reader"
            className="w-full rounded-[24px] overflow-hidden border-4 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-gray-900 min-h-[250px]"
          ></div>
          <p className="text-gray-400 text-center mt-6 text-sm">
            Point your camera directly at the product barcode sticker.
          </p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
