import { fetchNikeSnkrsFeed } from "../lib/monitor/nike-scraper.js";
import { sendDiscordWebhook } from "../lib/notifications/discord.js";
import { sendTelegramNotification } from "../lib/notifications/telegram.js";
import { sendLineNotify } from "../lib/notifications/line.js";

const intervalSec = parseInt(process.env.MONITOR_INTERVAL_SECONDS || "15", 10);
const regions = (process.env.MONITOR_REGIONS || "TH,US,JP").split(",");

console.log("👟 [SNKRS Monitor] Starting real-time drop radar...");
console.log(`📡 Monitored Regions: ${regions.join(", ")}`);
console.log(`⏱️ Polling Interval: ${intervalSec}s`);

const knownSkus = new Set<string>();

async function runCycle() {
  for (const region of regions) {
    const cleanRegion = region.trim();
    try {
      const drops = await fetchNikeSnkrsFeed(cleanRegion);
      for (const drop of drops) {
        if (!knownSkus.has(`${cleanRegion}-${drop.sku}`)) {
          knownSkus.add(`${cleanRegion}-${drop.sku}`);
          console.log(`✨ [New Drop] ${drop.title} (${cleanRegion}) - ${drop.styleCode}`);

          if (process.env.DISCORD_WEBHOOK_URL) {
            await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
              sneaker: drop,
              event: "NEW_DROP_LOADED",
            });
          }
          if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            await sendTelegramNotification(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID, {
              sneaker: drop,
              event: "NEW_DROP_LOADED",
            });
          }
          if (process.env.LINE_NOTIFY_TOKEN) {
            await sendLineNotify(process.env.LINE_NOTIFY_TOKEN, {
              sneaker: drop,
              event: "NEW_DROP_LOADED",
            });
          }
        }
      }
    } catch (err) {
      console.error(`❌ [Monitor Error] Region ${cleanRegion}:`, err);
    }
  }
}

// Initial cycle & interval
runCycle();
setInterval(runCycle, intervalSec * 1000);
