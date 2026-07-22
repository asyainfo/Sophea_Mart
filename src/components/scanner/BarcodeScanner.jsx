import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase"; // Adjust this path if needed
import { FiX, FiLoader } from "react-icons/fi";

export default function BarcodeScanner({ onClose, toast }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 1. Initialize the scanner with a clean rectangle target
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        showTorchButtonIfSupported: true, // Adds a flashlight button if phone supports it
      },
      false,
    );

    const onScanSuccess = async (decodedText) => {
      // Prevent scanning multiple times in a row
      if (isProcessing) return;

      // 2. Stop the camera immediately and show loading state
      setIsProcessing(true);
      scanner.clear();

      // 3. Haptic feedback: Vibrate phone for 200ms
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      try {
        // 4. Query Supabase directly to verify the product exists
        const { data, error } = await supabase
          .from("products")
          .select("barcode")
          .eq("barcode", decodedText)
          .maybeSingle();

        if (data) {
          // Success! Redirect to the beautiful ProductDetail page
          navigate(`/product/${decodedText}`);
          onClose();
        } else {
          // Fail: Product not found in database
          toast("រកមិនឃើញផលិតផលនេះទេ! (Product not found)", "error");
          onClose(); // Close scanner so they can try again or browse
        }
      } catch (err) {
        toast("មានបញ្ហាក្នុងការស្កេន (Scanning error)", "error");
        onClose();
      }
    };

    // Render the scanner UI
    scanner.render(onScanSuccess, (error) => {
      // Ignore background scanning errors (it errors continuously until it finds a barcode)
    });

    // Cleanup camera when closed
    return () => {
      scanner.clear().catch(console.error);
    };
  }, [navigate, onClose, isProcessing, toast]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <h2 className="text-white font-bold text-lg">ស្កេនបាកូដផលិតផល</h2>
        <button
          onClick={onClose}
          className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 backdrop-blur-md transition-all"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* Main Scanner Area */}
      {isProcessing ? (
        <div className="flex flex-col items-center gap-5 text-white animate-in fade-in zoom-in duration-300">
          <FiLoader size={56} className="animate-spin text-blue-500" />
          <p className="font-bold text-lg">កំពុងស្វែងរកផលិតផល...</p>
        </div>
      ) : (
        <div className="w-full max-w-sm px-6 flex flex-col items-center animate-in fade-in duration-300">
          {/* Custom CSS to hide ugly default HTML5-QRCode buttons and borders */}
          <style>
            {`
              #reader { border: none !important; border-radius: 24px; overflow: hidden; }
              #reader video { object-fit: cover; border-radius: 24px; }
              #reader__dashboard_section_csr span { color: white !important; font-family: 'Inter', sans-serif; }
              #reader__dashboard_section_swaplink { color: #3b82f6 !important; text-decoration: none; margin-top: 10px; display: inline-block; }
            `}
          </style>

          <div
            id="reader"
            className="w-full bg-black rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.4)] border-2 border-blue-500/50"
          ></div>

          <p className="text-gray-400 text-center mt-8 text-[15px] font-medium leading-relaxed">
            សូមដាក់កាមេរ៉ារបស់អ្នកឱ្យចំកូដ
            <br />
            នៅលើសំបកផលិតផល
          </p>
        </div>
      )}
    </div>
  );
}
