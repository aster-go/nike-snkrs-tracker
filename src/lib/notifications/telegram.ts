import axios from "axios";
import type { WebhookPayload } from "../types";
import { formatPrice } from "../utils";

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  payload: WebhookPayload
): Promise<boolean> {
  const { sneaker, event, restockedSizes } = payload;
  const isRestock = event === "RESTOCK_DETECTED";

  const header = isRestock ? "🚨 *RESTOCK DETECTED*" : "👟 *UPCOMING DROP LOADED*";
  const sizeList = restockedSizes && restockedSizes.length > 0
    ? restockedSizes.join(", ")
    : (sneaker.sizes || []).filter(s => s.inStock).map(s => `US ${s.sizeUs}`).join(", ") || "All Sizes";

  const message = `${header} (${sneaker.region})
━━━━━━━━━━━━━━━━━━
*${sneaker.title}*
_${sneaker.subtitle || sneaker.colorway || ""}_

• *Style Code:* \`${sneaker.styleCode}\`
• *Price:* ${formatPrice(sneaker.retailPrice, sneaker.currency)}
• *Launch Type:* ${sneaker.launchType}
• *Launch Time:* ${new Date(sneaker.launchDate).toLocaleString()}
• *Sizes:* ${sizeList}

[🔗 Open on Nike SNKRS](${sneaker.snkrsUrl})`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    await axios.post(url, {
      chat_id: chatId,
      photo: sneaker.imageUrl,
      caption: message,
      parse_mode: "Markdown",
    });
    return true;
  } catch (error) {
    console.error("[TelegramNotification] Failed to send message:", error);
    return false;
  }
}
