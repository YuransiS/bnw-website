import fs from "fs";
import path from "path";

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        process.env[key] = value;
      }
    }
  });
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const threadId = process.env.TELEGRAM_THREAD_ID;

console.log("Using Token:", token ? `${token.substring(0, 10)}...` : "undefined");
console.log("Using Chat ID:", chatId);
console.log("Using Thread ID:", threadId);

const lead = {
  name: "Antigravity Test (Антигравити)",
  phone: "+380 99 999 9999",
  telegram: "antigravity_test",
  instagram: "antigravity_test_inst",
  button_id: "test_button"
};

const cleanTg = lead.telegram ? lead.telegram.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "") : "";
const cleanInst = lead.instagram ? lead.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "") : "";

const text = [
  `🔔 <b>Новая тестовая заявка! (Antigravity Test)</b>`,
  `• <b>Имя:</b> ${lead.name}`,
  `• <b>Телефон:</b> ${lead.phone}`,
  cleanTg ? `• <b>Telegram:</b> <a href="https://t.me/${cleanTg}">t.me/${cleanTg}</a>` : `• <b>Telegram:</b> не вказано`,
  cleanInst ? `• <b>Instagram:</b> <a href="https://instagram.com/${cleanInst}">instagram.com/${cleanInst}</a>` : `• <b>Instagram:</b> не вказано`
].join("\n");

async function send() {
  if (!token || !chatId) {
    console.error("Missing token or chatId in env");
    return;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (threadId) {
    const parsed = parseInt(threadId, 10);
    if (!isNaN(parsed)) {
      payload.message_thread_id = parsed;
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    console.log("Telegram response:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error sending message:", err);
  }
}

send();
