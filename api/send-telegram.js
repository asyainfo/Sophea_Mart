// api/send-telegram.js

// Helper to clean whitespace AND strip accidental surrounding quotes (" or ')
const cleanEnvVar = (val) =>
  (val || "")
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Safely parse body whether Vercel passes an object or a raw JSON string
  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  // Accept either "message" or "text" from the request body
  const { message, text, parse_mode = "HTML" } = body;
  const rawMessage = (message || text || "").toString().trim();

  if (!rawMessage) {
    return res.status(400).json({ error: "Valid message text is required" });
  }

  // Telegram's hard limit is 4096 chars; truncate safely if an order is huge
  const finalMessage =
    rawMessage.length > 4000
      ? `${rawMessage.slice(0, 4000)}\n...(truncated)`
      : rawMessage;

  // 2. Support both standard and VITE_ prefixed env variables & strip any quotes
  const token = cleanEnvVar(
    process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN,
  );
  const chatId = cleanEnvVar(
    process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID,
  );

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Server is missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
    });
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: finalMessage,
        parse_mode,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });

    const data = await response.json();

    if (response.ok && data?.ok) {
      return res.status(200).json({ ok: true, success: true });
    }

    // 3. Failsafe: If special characters (&, <, >) broke Telegram's HTML parser, retry as plain text
    if (parse_mode && data?.description?.includes("can't parse entities")) {
      const retryRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: finalMessage,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
      });
      const retryData = await retryRes.json();

      if (retryRes.ok && retryData?.ok) {
        return res.status(200).json({ ok: true, success: true });
      }
    }

    console.error("Telegram API rejected request:", data);
    return res.status(400).json({
      error: data?.description || "Telegram API failed to send message",
    });
  } catch (error) {
    console.error("Telegram API Error:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
}
