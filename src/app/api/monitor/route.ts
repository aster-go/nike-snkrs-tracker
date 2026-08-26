import { NextResponse } from "next/server";
import { fetchNikeSnkrsFeed } from "@/lib/monitor/nike-scraper";
import { sendDiscordWebhook } from "@/lib/notifications/discord";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import { sendLineNotify } from "@/lib/notifications/line";

export async function POST(request: Request) {
  const regions = (process.env.MONITOR_REGIONS || "TH").split(",");
  const results = [];

  for (const region of regions) {
    const drops = await fetchNikeSnkrsFeed(region.trim());
    results.push({ region: region.trim(), dropCount: drops.length });

    // Broadcast restock notifications if configured
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChat = process.env.TELEGRAM_CHAT_ID;
    const lineToken = process.env.LINE_NOTIFY_TOKEN;

    const liveDrops = drops.filter((d) => d.status === "ACTIVE");
    for (const drop of liveDrops.slice(0, 3)) {
      if (discordUrl) {
        await sendDiscordWebhook(discordUrl, {
          sneaker: drop,
          event: "DROP_LIVE_NOW",
        });
      }
      if (telegramToken && telegramChat) {
        await sendTelegramNotification(telegramToken, telegramChat, {
          sneaker: drop,
          event: "DROP_LIVE_NOW",
        });
      }
      if (lineToken) {
        await sendLineNotify(lineToken, {
          sneaker: drop,
          event: "DROP_LIVE_NOW",
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
