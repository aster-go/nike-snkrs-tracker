import axios from "axios";
import type { WebhookPayload } from "../types";
import { formatPrice } from "../utils";

export async function sendDiscordWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  const { sneaker, event, restockedSizes } = payload;
  const isRestock = event === "RESTOCK_DETECTED";

  const color = isRestock ? 0x10b981 : 0xef4444; // Green for restock, Red for new drop
  const eventTitle = isRestock
    ? `🚨 RESTOCK DETECTED (${sneaker.region})`
    : `👟 UPCOMING DROP LOADED (${sneaker.region})`;

  const sizeList = restockedSizes && restockedSizes.length > 0
    ? restockedSizes.join(", ")
    : (sneaker.sizes || []).filter(s => s.inStock).map(s => `US ${s.sizeUs}`).join(", ") || "All Sizes";

  const embed = {
    title: `${eventTitle}: ${sneaker.title}`,
    url: sneaker.snkrsUrl,
    description: sneaker.subtitle || sneaker.colorway || "Nike SNKRS Launch",
    color: color,
    fields: [
      {
        name: "🏷️ Style Code",
        value: `\`${sneaker.styleCode}\``,
        inline: true,
      },
      {
        name: "💰 Retail Price",
        value: formatPrice(sneaker.retailPrice, sneaker.currency),
        inline: true,
      },
      {
        name: "⏰ Launch Time",
        value: `<t:${Math.floor(new Date(sneaker.launchDate).getTime() / 1000)}:F>`,
        inline: true,
      },
      {
        name: "⚡ Launch Type",
        value: sneaker.launchType,
        inline: true,
      },
      {
        name: "📏 Available Sizes",
        value: sizeList.length > 1000 ? sizeList.slice(0, 1000) + "..." : sizeList,
        inline: false,
      },
      {
        name: "🔗 Direct Links",
        value: `[Web Link](${sneaker.snkrsUrl}) • [SNKRS App](nike://snkrs/t/${sneaker.styleCode})`,
        inline: false,
      }
    ],
    image: {
      url: sneaker.imageUrl,
    },
    footer: {
      text: "SNKRS Radar • Automated Drop Monitor",
      icon_url: "https://static.nike.com/a/images/f_auto/dpr_3.0,cs_srgb/w_300,c_limit/g1asfango1fdgahcqofa/nike-logo.jpg",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl, {
      username: "Nike SNKRS Radar",
      avatar_url: "https://static.nike.com/a/images/f_auto/dpr_3.0,cs_srgb/w_300,c_limit/g1asfango1fdgahcqofa/nike-logo.jpg",
      embeds: [embed],
    });
    return true;
  } catch (error) {
    console.error("[DiscordWebhook] Failed to send notification:", error);
    return false;
  }
}
