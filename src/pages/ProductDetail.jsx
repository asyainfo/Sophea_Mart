import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { supabase } from "../services/supabase";
import { CartContext } from "../context/CartContext";
import {
  FiShoppingCart,
  FiHeart,
  FiX,
  FiLoader,
  FiCheck,
  FiSearch,
} from "react-icons/fi";

const ProductDetail = () => {
  const { barcode } = useParams();
  const navigate = useNavigate();

  const cartCtx = useContext(CartContext);
  const addToCart = cartCtx?.addToCart;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcode)
        .single();

      if (error) {
        console.error("Error fetching product:", error.message);
      } else if (data) {
        setProduct(data);
      }
      setLoading(false);
    };

    if (barcode) {
      fetchProduct();
    }
  }, [barcode]);

  const handleAddToCart = () => {
    if (product && addToCart) {
      addToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  // 🏆 UPGRADE: Premium Loading State
  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="p-4 bg-white rounded-full shadow-sm border border-gray-50">
          <FiLoader className="animate-spin text-blue-600" size={28} />
        </div>
        <span className="text-gray-500 font-medium text-[15px] tracking-wide">
          កំពុងទាញយកទិន្នន័យ...
        </span>
      </div>
    );
  }

  // 🏆 UPGRADE: Premium "Not Found" State
  if (!product) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4 w-full max-w-sm animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
            <FiSearch size={28} />
          </div>
          <h3 className="text-gray-900 font-bold text-xl">រកមិនឃើញផលិតផលទេ</h3>
          <p className="text-gray-500 text-[14px] leading-relaxed mb-4">
            សូមអភ័យទោស បាកូដនេះមិនមាននៅក្នុងប្រព័ន្ធរបស់យើងនៅឡើយទេ។
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            ត្រឡប់ទៅទំព័រដើម
          </button>
        </div>
      </div>
    );
  }

  // Calculate Khmer Riel price (1 USD = 4,000 KHR)
  const usdPrice = product.price ? Number(product.price) : 0.0;
  const khrPrice = (usdPrice * 4000).toLocaleString();

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex justify-center items-start pt-6 pb-32 px-4 bg-gray-50/30">
      {/* 🏆 UPGRADE: Ultra-Modern Card Container */}
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100/50 flex flex-col overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50/80">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">
            ព័ត៌មានលម្អិត
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 bg-gray-50 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-95"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          {/* 🏆 UPGRADE: Image Area (Perfectly squared framing) */}
          <div className="relative w-full aspect-square max-h-[280px] bg-gray-50/50 rounded-2xl mb-6 flex items-center justify-center border border-gray-100/50">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-4 left-4 p-3 bg-white shadow-sm border border-gray-100/50 rounded-full text-gray-300 hover:text-red-500 active:scale-90 transition-all z-10"
            >
              <FiHeart
                size={18}
                className={isFavorite ? "fill-red-500 text-red-500" : ""}
              />
            </button>

            <div
              className={`absolute top-4 right-4 font-bold text-[12px] tracking-wide px-3.5 py-1.5 rounded-full shadow-sm z-10 backdrop-blur-md ${
                product.in_stock !== false
                  ? "bg-emerald-50/90 text-emerald-600 border border-emerald-100/50"
                  : "bg-rose-50/90 text-rose-600 border border-rose-100/50"
              }`}
            >
              {product.in_stock !== false ? "មានក្នុងស្តុក" : "អស់ពីស្តុក"}
            </div>

            <img
              src={
                imgError || !product.image ? "/placeholder.png" : product.image
              }
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain p-6 mix-blend-multiply"
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-snug tracking-tight">
              {product.name}
            </h1>

            {/* Pricing Layout */}
            <div className="flex items-end gap-3 mb-4 mt-2">
              <span className="text-[28px] font-black text-blue-600 leading-none">
                ${usdPrice.toFixed(2)}
              </span>
              <span className="text-[15px] font-bold text-gray-400 line-through decoration-2 mb-1">
                ៛{khrPrice}
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-gray-50 text-gray-600 font-semibold text-[13px] px-3.5 py-1.5 rounded-lg border border-gray-100/80">
                ប្រភេទ: {product.category || "ភេសជ្ជៈ"}
              </span>
              <span className="bg-gray-50 text-gray-600 font-semibold text-[13px] px-3.5 py-1.5 rounded-lg border border-gray-100/80">
                ទំហំ: {product.sizes || "មិនបញ្ជាក់"}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-500 text-[14px] mb-2 mt-3 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* 🏆 UPGRADE: Action Button (Native tactile feel) */}
          <div className="mt-6 pt-6 border-t border-gray-100/80">
            <button
              onClick={handleAddToCart}
              disabled={product.in_stock === false}
              className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${
                product.in_stock === false
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : added
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/25"
                    : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
              }`}
            >
              {added ? (
                <>
                  <FiCheck size={20} />
                  <span className="text-[16px]">បានបន្ថែមចូលកន្ត្រក!</span>
                </>
              ) : (
                <>
                  <FiShoppingCart size={20} />
                  <span className="text-[16px]">បន្ថែមចូលកន្ត្រក</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
