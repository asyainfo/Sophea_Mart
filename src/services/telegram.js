const cleanEnv = (val) =>
  (val || "")
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "");

export async function sendTelegramNotification(
  messageText,
  parseMode = "HTML",
) {
  if (!messageText || typeof messageText !== "string") return false;

  const trimmed = messageText.trim();
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
    const payload = {
      chat_id: chatId,
      text: finalMessage,
      disable_web_page_preview: true,
    };
    if (mode) payload.parse_mode = mode;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// Export alias so imports using either function name work seamlessly
export const sendTelegramAlert = sendTelegramNotification;
