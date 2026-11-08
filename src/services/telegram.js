// src/services/telegram.js

// Helper to trim whitespace and strip accidental surrounding quotes (" or ')
const cleanEnv = (val) =>
  (val || "")
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "");

// Escape user/product strings so symbols like "&" (e.g., "M&M's") never break Telegram HTML mode
const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Strip HTML tags cleanly if plain-text fallback is ever needed
const stripHtml = (str) => String(str ?? "").replace(/<[^>]*>/g, "");

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
  paymentMethod,
  bankName,
  phoneNumber,
  receiptUrl,
  items = [],
}) {
  const usdFormatted = Number(totalUsd || 0).toFixed(2);
  const khrFormatted = Math.round(Number(totalKhr || 0)).toLocaleString(
    "en-US",
  );
  const dateStr =
    dateFormatted ||
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
      dateStyle: "medium",
      timeStyle: "short",
    });

  const lines = [
    "🚨 <b>មានការបញ្ជាទិញថ្មី!</b> 🚨",
    "----------------------------------------",
    `🆔 លេខកូដបញ្ជាទិញ: <b>${escapeHtml(orderId || "N/A")}</b>`,
    `👤 អតិថិជន: ${escapeHtml(customerName || "Customer")}`,
    `📅 កាលបរិច្ឆេទ: ${escapeHtml(dateStr)}`,
  ];

  if (paymentMethod) {
    const methodLabel =
      paymentMethod === "bank"
        ? `Bank Transfer${bankName ? ` (${escapeHtml(bankName)})` : ""}`
        : "Cash / Takeaway";
    lines.push(`💳 ការទូទាត់: <b>${methodLabel}</b>`);
  }

  if (phoneNumber) {
    lines.push(`📞 លេខទូរស័ព្ទ: <b>${escapeHtml(phoneNumber)}</b>`);
  }

  lines.push("");
  lines.push(`💵 តម្លៃសរុប: <b>$${usdFormatted} (${khrFormatted}៛)</b>`);
  lines.push(`📦 ចំនួនទំនិញ: ${Number(itemCount || 1)} items`);

  // Include itemized packing list if passed from CheckoutModal
  if (Array.isArray(items) && items.length > 0) {
    lines.push("");
    lines.push("🧾 <b>បញ្ជីទំនិញ:</b>");
    items.slice(0, 20).forEach((item) => {
      const qty = Number(item?.quantity ?? item?.qty ?? 1);
      const price = Number(item?.price || 0);
      const lineTotal = (price * qty).toFixed(2);
      const itemName = escapeHtml(item?.name || item?.product_name || "Item");
      lines.push(`  • ${itemName} ×${qty} ($${lineTotal})`);
    });
    if (items.length > 20) {
      lines.push(`  • ...និង ${items.length - 20} មុខទៀត`);
    }
  }

  if (receiptUrl) {
    const safeUrl = String(receiptUrl).trim().replace(/"/g, "%22");
    lines.push("");
    lines.push(
      `🖼 <a href="${safeUrl}">មើលវិក្កយបត្រធនាគារ (View Receipt)</a>`,
    );
  }

  lines.push("----------------------------------------");
  lines.push(
    "🛒 សូមពិនិត្យមើល <b>Admin Dashboard</b> ដើម្បីដំណើរការការបញ្ជាទិញនេះ។",
  );

  return lines.join("\n");
}

/**
 * Helper: fetch with timeout + keepalive so mobile browsers don't cancel the request
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      keepalive: true,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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

  const finalMessage =
    trimmed.length > 3900
      ? `${stripHtml(trimmed).slice(0, 3900)}\n...(truncated)`
      : trimmed;

  const effectiveParseMode = trimmed.length > 3900 ? null : parseMode;

  const token = cleanEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);
  const chatId = cleanEnv(import.meta.env.VITE_TELEGRAM_CHAT_ID);

  // 1. Primary Method: Direct Telegram Bot API if VITE_ credentials are provided
  if (token && chatId) {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

    const postDirect = async (textToSend, mode) => {
      const body = {
        chat_id: chatId,
        text: textToSend,
        disable_web_page_preview: false,
      };
      if (mode) body.parse_mode = mode;

      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    };

    try {
      let data = await postDirect(finalMessage, effectiveParseMode);
      if (data?.ok) return true;

      // Failsafe: If special characters broke HTML parsing, strip HTML tags and retry as plain text
      if (effectiveParseMode) {
        data = await postDirect(stripHtml(finalMessage), null);
        if (data?.ok) return true;
      }

      console.error(
        "⚠️ Telegram API Error:",
        data?.description || "Unknown error",
      );
    } catch (err) {
      console.warn(
        "⚠️ Direct Telegram request failed, trying serverless fallback:",
        err.message,
      );
    }
  }

  // 2. Fallback Method: Vercel Serverless API Route (/api/send-telegram)
  try {
    const response = await fetchWithTimeout(
      "/api/send-telegram",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          text: finalMessage,
          parse_mode: effectiveParseMode,
        }),
      },
      5000,
    );

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const result = await response.json();
      if (result?.success || result?.ok) return true;
    }
  } catch {
    // Ignore if /api/send-telegram does not exist
  }

  if (!token || !chatId) {
    console.error(
      "⚠️ Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID! Make sure they are added in Vercel -> Settings -> Environment Variables and redeploy.",
    );
  }

  return false;
}

// Export all aliases so CheckoutModal.jsx and any other files work seamlessly!
export const sendOrderNotification = sendTelegramNotification;
export const sendTelegramAlert = sendTelegramNotification;
