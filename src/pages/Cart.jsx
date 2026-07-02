import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { fmt, fmtKHR } from "../utils/currency";
import { FiTrash2, FiShoppingBag, FiArrowRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// 🏆 1. IMPORT YOUR CUSTOM BUTTON COMPONENT
import Button from "../components/ui/Button";

export default function Cart({ onCheckout }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, total, dispatch } = useCart();

  const handleRemove = (id) => {
    dispatch({ type: "REMOVE", id });
  };

  // --- EMPTY CART STATE ---
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6">
          <FiShoppingBag size={64} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("cart_page.empty_title", "Your cart is empty")}
        </h2>
        <p className="text-gray-500 mb-8 max-w-md text-sm">
          {t(
            "cart_page.empty_desc",
            "Looks like you haven't added anything to your cart yet. Let's find some great products!",
          )}
        </p>

        {/* 🏆 2. USE THE CUSTOM BUTTON TO MATCH YOUR FAVORITES PAGE */}
        <Button variant="primary" onClick={() => navigate("/")}>
          {t("cart_page.start_shopping", "Return to Store")}
        </Button>
      </div>
    );
  }

  // --- POPULATED CART STATE ---
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:py-10">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6 md:mb-8">
        {t("cart_page.title", "Shopping Cart")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-center gap-6 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 object-contain"
              />

              <div className="flex-1 text-center sm:text-left w-full">
                <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                  {item.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {t("cart_page.unit_price", "Unit Price:")}{" "}
                  <span className="font-medium text-gray-700">
                    {fmt(item.price)}
                  </span>
                </p>

                {/* Quantity Display */}
                <div className="inline-flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 text-sm font-medium">
                    {t("cart_page.qty", "Qty:")}
                  </span>
                  <span className="font-bold text-gray-900">{item.qty}</span>
                </div>
              </div>

              {/* Item Total & Remove Button */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 mt-2 sm:mt-0">
                <div className="text-xl font-black text-blue-600">
                  {fmt(item.price * item.qty)}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors flex items-center gap-2 group"
                  aria-label="Remove item"
                >
                  <FiTrash2
                    size={18}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="sm:hidden font-medium text-sm">
                    {t("cart_page.remove", "Remove")}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Order Summary */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm h-fit sticky top-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t("cart_page.order_summary", "Order Summary")}
          </h2>

          <div className="flex justify-between text-gray-600 mb-4">
            <span>{t("cart_page.total_items", "Total Items")}</span>
            <span className="font-bold text-gray-900">
              {items.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4"></div>

          <div className="flex justify-between items-end mb-8">
            <span className="text-gray-900 font-bold text-lg">
              {t("cart_page.total", "Total")}
            </span>
            <div className="text-right">
              <div className="text-3xl font-black text-blue-600">
                {fmt(total)}
              </div>
              <div className="text-sm font-medium text-gray-400 mt-1">
                {fmtKHR(total)}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 py-4 text-lg"
          >
            {t("cart_page.checkout", "Proceed to Checkout")}
            <FiArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
