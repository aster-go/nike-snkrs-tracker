import axios from "axios";
import type { WebhookPayload } from "../types";
import { formatPrice } from "../utils";

export async function sendLineNotify(lineToken: string, payload: WebhookPayload): Promise<boolean> {
  const { sneaker, event, restockedSizes } = payload;
  const isRestock = event === "RESTOCK_DETECTED";

  const sizeList = restockedSizes && restockedSizes.length > 0
    ? restockedSizes.join(", ")
    : (sneaker.sizes || []).filter(s => s.inStock).map(s => `US ${s.sizeUs}`).join(", ") || "All Sizes";

  const message = `
${isRestock ? "🚨 [RESTOCK]" : "👟 [NEW DROP]"} ${sneaker.title}
• รหัสสินค้า: ${sneaker.styleCode}
• ราคาป้าย: ${formatPrice(sneaker.retailPrice, sneaker.currency)}
• วางจำหน่าย: ${new Date(sneaker.launchDate).toLocaleString("th-TH")}
• รูปแบบ: ${sneaker.launchType}
• ไซส์: ${sizeList}
• ลิงก์: ${sneaker.snkrsUrl}`;

  try {
    const params = new URLSearchParams();
    params.append("message", message);
    params.append("imageThumbnail", sneaker.imageUrl);
    params.append("imageFullsize", sneaker.imageUrl);

    await axios.post("https://notify-api.line.me/api/notify", params, {
      headers: {
        "Authorization": `Bearer ${lineToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return true;
  } catch (error) {
    console.error("[LineNotify] Failed to send notification:", error);
    return false;
  }
}
