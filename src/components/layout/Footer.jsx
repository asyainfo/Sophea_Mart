import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiFacebook,
  FiSend,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(path);
  };

  return (
    <footer className="sophea-footer">
      <style>
        {`
          .sophea-footer {
            background-color: #003D99;
            color: #aab3bfff;
            padding: 64px 24px 32px;
            border-top: 1px solid #3d4c62ff;
            font-family: 'Poppins', system-ui, sans-serif;
            position: relative;
            overflow: hidden;
            margin-top: 40px;
          }
          .footer-glow {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 800px;
            height: 400px;
            background-color: rgba(37, 99, 235, 0.08); 
            filter: blur(100px);
            border-radius: 50%;
            pointer-events: none;
          }
          .footer-container {
            max-width: 1280px;
            margin: 0 auto;
            position: relative;
            z-index: 10;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 48px;
            margin-bottom: 48px;
          }
          @media (min-width: 768px) {
            .footer-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 1024px) {
            .footer-grid { grid-template-columns: repeat(4, 1fr); }
          }
          .footer-brand {
            font-size: 24px;
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 16px 0;
            cursor: pointer;
            letter-spacing: -0.5px;
          }
          .footer-brand span { color: #3385FF; }
          .footer-desc {
            font-size: 14px;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }
          .footer-exchange {
            display: inline-flex;
            align-items: center;
            gap: 10px; 
            padding: 8px 16px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            color: #b4cdecff;
            font-size: 14px;
            font-weight: 600;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
          }
          .footer-title {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 24px 0;
          }
          .footer-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .footer-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            text-align: left;
          }
          .footer-link:hover {
            color: #60a5fa;
            transform: translateX(6px);
          }
          .footer-contact-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            color: #94a3b8;
            font-size: 14px;
            transition: color 0.3s ease;
          }
          .footer-contact-item:hover { color: #e2e8f0; }
          .footer-icon-box {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(30, 41, 59, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.3s ease;
          }
          .footer-contact-item:hover .footer-icon-box {
            background: rgba(59, 130, 246, 0.2);
          }
          .footer-social-flex { display: flex; gap: 12px; }
          .footer-social-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(30, 41, 59, 0.8);
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .footer-social-btn:hover {
            background: #3b82f6;
            color: #ffffff;
            transform: translateY(-4px);
          }
          .footer-bottom {
            border-top: 1px solid rgba(30, 41, 59, 0.6);
            margin-top: 24px;
            padding-top: 32px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            justify-content: space-between;
            font-size: 14px;
          }
          @media (min-width: 768px) {
            .footer-bottom { flex-direction: row; }
          }
          .footer-legal span {
            cursor: pointer;
            transition: color 0.3s ease;
            margin-left: 24px;
          }
          .footer-legal span:hover { color: #60a5fa; }
        `}
      </style>

      <div className="footer-glow"></div>

      <div className="footer-container">
        <div className="footer-grid">
          <div>
            <h3 className="footer-brand" onClick={() => handleNavigation("/")}>
              SOPHEA <span>MART</span>
            </h3>
            <p className="footer-desc">
              {t(
                "footer.desc",
                "Your local mart with cold drinks, daily groceries, delicious snacks, and baby essentials to fulfill your everyday needs.",
              )}
            </p>
            <div className="footer-exchange">
              <FiRefreshCw size={16} />
              <span>{t("footer.exchange_rate", "1 USD = 4,000 KHR")}</span>
            </div>
          </div>

          <div>
            <h4 className="footer-title">
              {t("footer.quick_links", "Quick Links")}
            </h4>
            <ul className="footer-list">
              {[
                { path: "/", label: t("nav.back_store", "Store") },
                { path: "/cart", label: t("cart_page.title", "Shopping Cart") },
                {
                  path: "/favorites",
                  label: t("navbar.saved_items", "Saved Items"),
                },
                {
                  path: "/order-history",
                  label: t("navbar.my_orders", "My Orders"),
                },
              ].map((link, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => handleNavigation(link.path)}
                    className="footer-link"
                  >
                    <FiChevronRight size={14} />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-title">
              {t("footer.contact_us", "Contact Us")}
            </h4>
            <ul className="footer-list">
              <li className="footer-contact-item">
                <div className="footer-icon-box">
                  <FiMapPin color="#60a5fa" size={16} />
                </div>
                <span style={{ marginTop: "6px" }}>
                  {t("footer.address", "Phnom Penh, Cambodia")}
                </span>
              </li>
              <li className="footer-contact-item">
                <div className="footer-icon-box">
                  <FiPhone color="#60a5fa" size={16} />
                </div>
                <span>+855 61 470 636</span>
              </li>
              <li className="footer-contact-item">
                <div className="footer-icon-box">
                  <FiMail color="#60a5fa" size={16} />
                </div>
                <span>support@sopheamart.store</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-title">
              {t("footer.follow_us", "Follow Us")}
            </h4>
            <div className="footer-social-flex">
              <a
                href="https://www.facebook.com/share/1GeiqjKxJY/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="Facebook"
              >
                <FiFacebook size={18} />
              </a>
              {/* 🏆 REPLACE THIS LINK WITH YOUR ACTUAL TELEGRAM LINK */}
              <a
                href="https://t.me/+nQq97lWrFwowODc1"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="Telegram"
              >
                <FiSend size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Sophea Mart.{" "}
            {t("footer.rights", "All rights reserved.")}
          </p>
          <div className="footer-legal">
            <span>{t("footer.privacy", "Privacy Policy")}</span>
            <span>{t("footer.terms", "Terms of Service")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
