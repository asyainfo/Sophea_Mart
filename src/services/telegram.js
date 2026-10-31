// src/services/telegram.js

export async function sendTelegramAlert(message) {
  try {
    // 1. In production (Vercel), use the secure /api/send-telegram route
    const response = await fetch("/api/send-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (response.ok) {
      return { success: true };
    }

    // 2. Fallback for local `npm run dev` testing
    const localToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const localChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (import.meta.env.DEV && localToken && localChatId) {
      const devRes = await fetch(
        `https://api.telegram.org/bot${localToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: localChatId,
            text: message,
            parse_mode: "HTML",
          }),
        },
      );
      return { success: devRes.ok };
    }

    return { success: false };
  } catch (error) {
    console.error("Telegram Alert Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Formats the exact Khmer Order Notification for SOPHEA MART
 */
export async function sendOrderNotification({
  orderId,
  customerName,
  dateFormatted,
  totalUsd,
  totalKhr,
  itemCount,
}) {
  const message = [
    `🚨 <b>មានការបញ្ជាទិញថ្មី!</b> 🚨`,
    `------------------------------------`,
    `🆔 លេខកូដបញ្ជាទិញ: ${orderId}`,
    `👤 អតិថិជន: ${customerName}`,
    `📅 កាលបរិច្ឆេទ: ${dateFormatted}`,
    ``,
    `💵 តម្លៃសរុប: $${Number(totalUsd).toFixed(2)} (${Number(totalKhr).toLocaleString()}៛)`,
    `📦 ចំនួនទំនិញ: ${itemCount} items`,
    `------------------------------------`,
    `🛒 សូមពិនិត្យមើល <b>Admin Dashboard</b> ដើម្បីដំណើរការការបញ្ជាទិញនេះ។`,
  ].join("\n");

  return sendTelegramAlert(message);
}
