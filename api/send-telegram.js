export default async function handler(req, res) {
  if (req.method !== "POST") {
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
  const finalMessage = (message || text || "").toString().trim();

  // 2. Support both standard and VITE_ prefixed environment variables in Vercel (and trim whitespace)
  const token = (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.VITE_TELEGRAM_BOT_TOKEN ||
    ""
  ).trim();

  const chatId = (
    process.env.TELEGRAM_CHAT_ID ||
    process.env.VITE_TELEGRAM_CHAT_ID ||
    ""
  ).trim();

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Server is missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
    });
  }

  if (!finalMessage) {
    return res.status(400).json({ error: "Valid message text is required" });
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
      }),
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
        }),
      });
      const retryData = await retryRes.json();

      if (retryRes.ok && retryData?.ok) {
        return res.status(200).json({ ok: true, success: true });
      }
    }

    return res.status(400).json({
      error: data?.description || "Telegram API failed to send message",
    });
  } catch (error) {
    console.error("Telegram API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
