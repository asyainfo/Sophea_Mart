// src/services/telegram.js

// Helper to trim whitespace and strip accidental surrounding quotes (" or ')
const cleanEnv = (val) =>
  (val || "")
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "");

/**
 * Formats an order details object into the Khmer Telegram receipt template
 */
export function formatOrderTelegramMessage({
  orderId,
  customerName = "Customer",
  dateFormatted,
  totalUsd = 0,
  totalKhr = 0,
  itemCount = 1,
}) {
  const usdFormatted = Number(totalUsd).toFixed(2);
  const khrFormatted = Number(totalKhr).toLocaleString("en-US");
  const dateStr =
    dateFormatted ||
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
      dateStyle: "medium",
      timeStyle: "short",
    });

  return [
    "🚨 <b>មានការបញ្ជាទិញថ្មី!</b> 🚨",
    "----------------------------------------",
    `🆔 លេខកូដបញ្ជាទិញ: ${orderId}`,
    `👤 អតិថិជន: ${customerName}`,
    `📅 កាលបរិច្ឆេទ: ${dateStr}`,
    "",
    `💵 តម្លៃសរុប: $${usdFormatted} (${khrFormatted}៛)`,
    `📦 ចំនួនទំនិញ: ${itemCount} items`,
    "----------------------------------------",
    "🛒 សូមពិនិត្យមើល <b>Admin Dashboard</b> ដើម្បីដំណើរការការបញ្ជាទិញនេះ។",
  ].join("\n");
}

/**
 * Sends a notification to Telegram (accepts EITHER a string OR an order object!)
 */
export async function sendTelegramNotification(
  payloadOrText,
  parseMode = "HTML",
) {
  if (!payloadOrText) return false;

  // Automatically convert an order object from CheckoutModal into the Khmer receipt string
  const rawText =
    typeof payloadOrText === "object"
      ? formatOrderTelegramMessage(payloadOrText)
      : String(payloadOrText);

  const trimmed = rawText.trim();
  if (!trimmed) return false;

  // Telegram's hard limit is 4096 chars; truncate safely if an order is huge
  const finalMessage =
    trimmed.length > 4000
      ? `${trimmed.slice(0, 4000)}\n...(truncated)`
      : trimmed;

  // 1. In Production (Vercel), try the secure Serverless API route first
  if (!import.meta.env.DEV) {
    try {
      const response = await fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          text: finalMessage,
          parse_mode: parseMode,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        const result = await response.json();
        if (result?.success || result?.ok) return true;
      }
    } catch {
      // Fall through to direct Telegram API fallback
    }
  }

  // 2. Direct Telegram API (Used on localhost or if /api route isn't configured)
  const token = cleanEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnv(import.meta.env.VITE_TELEGRAM_CHAT_ID);

  if (!token || !chatId) {
    console.error(
      "⚠️ Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID in your .env file!",
    );
    return false;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  const postToTelegram = async (mode) => {
    const body = {
      chat_id: chatId,
      text: finalMessage,
      disable_web_page_preview: true,
    };
    if (mode) body.parse_mode = mode;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  try {
    let data = await postToTelegram(parseMode);
    if (data?.ok) return true;

    // 3. Failsafe: If special characters (&, <, >) broke HTML parsing, retry as plain text
    if (parseMode && data?.description?.includes("can't parse entities")) {
      data = await postToTelegram(null);
      if (data?.ok) return true;
    }

    console.error(
      "⚠️ Telegram API Error:",
      data?.description || "Unknown error",
    );
    return false;
  } catch (err) {
    console.error("⚠️ Network error sending Telegram message:", err);
    return false;
  }
}

// Export all aliases so CheckoutModal.jsx and any other files work seamlessly!
export const sendOrderNotification = sendTelegramNotification;
export const sendTelegramAlert = sendTelegramNotification;
