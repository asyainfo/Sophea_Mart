import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { fmt, fmtKHR } from "../utils/currency";
import { FiTrash2, FiShoppingBag, FiArrowRight } from "react-icons/fi";

export default function Cart({ onCheckout }) {
  const navigate = useNavigate();
  const { items, total, dispatch } = useCart();

  const handleRemove = (id) => {
    dispatch({ type: "REMOVE", id });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <FiShoppingBag size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
          Your cart is empty
        </h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Looks like you haven't added anything to your cart yet. Let's find
          some great products!
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:py-10">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 object-contain"
              />

              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {item.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Unit Price: {fmt(item.price)}
                </p>

                {/* Quantity Display */}
                <div className="inline-flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-gray-600 font-medium">Qty:</span>
                  <span className="font-bold text-gray-900">{item.qty}</span>
                </div>
              </div>

              {/* Item Total & Remove Button */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                <div className="text-xl font-extrabold text-blue-600">
                  {fmt(item.price * item.qty)}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition flex items-center gap-2"
                >
                  <FiTrash2 size={18} />
                  <span className="sm:hidden font-medium">Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Order Summary */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Order Summary
          </h2>

          <div className="flex justify-between text-gray-600 mb-4">
            <span>Total Items</span>
            <span className="font-medium text-gray-900">
              {items.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          <div className="flex justify-between items-end mb-8">
            <span className="text-gray-900 font-bold">Total</span>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-blue-600">
                {fmt(total)}
              </div>
              <div className="text-sm text-gray-500 mt-1">{fmtKHR(total)}</div>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
          >
            Proceed to Checkout
            <FiArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
