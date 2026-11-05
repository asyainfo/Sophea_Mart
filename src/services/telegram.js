export async function sendTelegramNotification(
  messageText,
  parseMode = "HTML",
) {
  if (!messageText || typeof messageText !== "string") return false;

  const cleanText = messageText.trim();
  if (!cleanText) return false;

  // 1. In Production (Vercel), use the secure Serverless API route first
  if (!import.meta.env.DEV) {
    try {
      const response = await fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          text: cleanText,
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

  // 2. Direct Telegram API (Used automatically on localhost or if /api route is unconfigured)
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.error(
      "⚠️ Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID in your .env file!",
    );
    return false;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const directRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: cleanText,
        parse_mode: parseMode,
      }),
    });

    const data = await directRes.json();

    if (data?.ok) return true;

    // 3. Failsafe: If HTML tags/characters (&, <, >) broke Telegram's parser, retry as plain text
    if (parseMode && data?.description?.includes("can't parse entities")) {
      const retryRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
        }),
      });
      const retryData = await retryRes.json();
      if (retryData?.ok) return true;
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

// Export alias so imports using either function name work seamlessly
export const sendTelegramAlert = sendTelegramNotification;
