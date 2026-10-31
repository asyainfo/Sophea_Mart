// api/send-telegram.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Server is missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
    });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Valid message text is required" });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return res.status(400).json({
        error: data.description || "Telegram API failed to send message",
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Telegram API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
