import { useCart } from "../../hooks/useCart";
import { FiShoppingCart, FiChevronRight } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export default function FloatingCartButton({ onOpen }) {
  const { count, total } = useCart();
  const { i18n } = useTranslation();

  // Do not render the button if the cart is empty
  if (count === 0) return null;

  return (
    <>
      <style>{`
        /* 1. Container locks to the bottom center of the screen on ALL devices */
        .floating-cart-container {
          position: fixed;
          bottom: 24px;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          padding: 0 16px;
          pointer-events: none; /* Lets you click through the invisible wrapper */
          animation: slideUp 0.3s ease-out forwards;
        }

        /* 2. The Button Styling - Centered pill layout */
        .floating-cart-button {
          pointer-events: auto; /* Re-enables clicking for the button itself */
          width: 100%;
          max-width: 400px;
          background: #2563EB; /* Blue-600 */
          color: white;
          border-radius: 999px; /* Pill shape */
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease-in-out;
        }

        .floating-cart-button:hover {
          transform: scale(1.02);
        }

        .floating-cart-button:active {
          transform: scale(0.97);
        }

        /* 3. Internal Layouts */
        .fc-left { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
        }
        
        .fc-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          padding: 10px;
          border-radius: 50%;
        }
        
        .fc-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #EF4444; /* Red-500 */
          color: white;
          font-size: 11px;
          font-weight: 900;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid #2563EB;
        }
        
        .fc-price-col { 
          display: flex; 
          flex-direction: column; 
          text-align: left; 
        }
        
        .fc-label { 
          font-size: 11px; 
          color: #DBEAFE; 
          font-weight: 600; 
          text-transform: uppercase; 
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }
        
        .fc-total { 
          font-size: 18px; 
          font-weight: 800; 
          line-height: 1; 
        }
        
        .fc-right {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.15);
          padding: 8px 16px;
          border-radius: 999px;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="floating-cart-container">
        <button onClick={onOpen} className="floating-cart-button">
          <div className="fc-left">
            <div className="fc-icon-wrapper">
              <FiShoppingCart size={22} />
              <span className="fc-badge">{count > 99 ? "99+" : count}</span>
            </div>
            <div className="fc-price-col">
              <span className="fc-label">
                {i18n.language === "km" ? "សរុប" : "Total"}
              </span>
              <span className="fc-total">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="fc-right">
            {i18n.language === "km" ? "មើលកន្ត្រក" : "View Cart"}
            <FiChevronRight size={18} />
          </div>
        </button>
      </div>
    </>
  );
}
