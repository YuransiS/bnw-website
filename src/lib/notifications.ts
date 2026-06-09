interface NotificationLead {
  name: string;
  phone: string;
  telegram: string | null;
  instagram: string | null;
  button_id: string;
}

export class NotificationService {
  /**
   * Dispatches notifications to the CRM dashboard.
   * Currently, since we are using frontend polling, this serves as an integration point
   * (e.g. logging activity or updating global cache) to prepare for full push notifications.
   */
  static async sendToDashboard(lead: NotificationLead): Promise<void> {
    console.log(`[NotificationService] sendToDashboard: Prepared lead activity event for polling. Lead: ${lead.name}`);
  }

  /**
   * Sends an asynchronous, non-blocking notification to Telegram using Bot API.
   * Deliberately designed to run concurrently and handle errors gracefully
   * to ensure no network delay blocks the user's lead submit button on the UI.
   */
  static async sendToTelegram(lead: NotificationLead): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_THREAD_ID;

    if (!token || !chatId) {
      console.warn(
        "[NotificationService] Telegram notifications are disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables)."
      );
      return;
    }

    // Parse clean usernames to generate correct telegram and instagram hyperlinks
    const cleanTg = lead.telegram ? lead.telegram.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "") : "";
    const cleanInst = lead.instagram ? lead.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "") : "";

    // Format the HTML message according to the exact template specification in Ukrainian
    const text = [
      `🔔 <b>Нова заявка на сайті!</b>`,
      `• <b>Ім'я:</b> ${lead.name}`,
      `• <b>Телефон:</b> ${lead.phone}`,
      cleanTg ? `• <b>Telegram:</b> <a href="https://t.me/${cleanTg}">t.me/${cleanTg}</a>` : `• <b>Telegram:</b> не вказано`,
      cleanInst ? `• <b>Instagram:</b> <a href="https://instagram.com/${cleanInst}">instagram.com/${cleanInst}</a>` : `• <b>Instagram:</b> не вказано`
    ].join("\n");

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      
      const payload: {
        chat_id: string;
        text: string;
        parse_mode: string;
        disable_web_page_preview: boolean;
        message_thread_id?: number;
      } = {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };

      if (threadId) {
        const parsedThreadId = parseInt(threadId, 10);
        if (!isNaN(parsedThreadId)) {
          payload.message_thread_id = parsedThreadId;
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[NotificationService] Telegram API responded with status ${response.status}: ${errorText}`
        );
      } else {
        console.log(`[NotificationService] Telegram notification dispatched successfully for lead: ${lead.name}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(
        "[NotificationService] Failed to send Telegram notification (network error/timeout):",
        error.message || error
      );
    }
  }
}
