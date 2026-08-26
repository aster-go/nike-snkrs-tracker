# Nike SNKRS Tracker & Auto-Buy Bot System Architecture

## 🏗️ 1. High-Level Architectural Design

**Nike SNKRS Tracker** is engineered as a three-tier architecture:
1. **Presentation Layer:** React 18 SPA built with Vite and Tailwind CSS.
2. **Gateway & API Proxy:** Express.js Node server handling Nike API aggregation and SSE log streaming.
3. **Automation Engine:** Playwright connecting via Chrome DevTools Protocol (CDP) on port 9222 to control authentic browser sessions.

```mermaid
graph TD
    subgraph ClientUI["React 18 Dashboard (Vite :5173)"]
        Grid["In-Stock & Upcoming Grids"]
        BotPanel["Bot Control & Task Manager"]
        SSEListener["SSE Real-Time Log Viewer"]
    end

    subgraph ServerGateway["Express.js Server (:3001)"]
        ScraperProxy["Nike API Content Proxy"]
        BotController["Bot REST API (/api/bot/*)"]
        SSEBroker["Server-Sent Events Stream (/api/bot/logs/stream)"]
    end

    subgraph BotEngine["Playwright + Chrome CDP Engine (:9222)"]
        PlaywrightController["bot/nikeBot.js Controller"]
        ChromeSession["Google Chrome Instance (C:\\ChromeBotProfile)"]
        PodiumMap["Podium data-qa Selector Engine"]
        AuditVault["Screenshot Audit Storage (bot/screenshots/)"]
    end

    subgraph ExternalServices["Nike Cloud Infrastructure"]
        NikeFeedAPI["snkrs.services.nike.com/snkrs/content/v2/public/web/TH/th"]
        NikeLaunchWeb["nike.com/th/launch/t/"]
    end

    Grid --> ScraperProxy --> NikeFeedAPI
    BotPanel --> BotController --> PlaywrightController
    PlaywrightController --> SSEBroker --> SSEListener

    PlaywrightController -->|CDP Session| ChromeSession
    PlaywrightController --> PodiumMap
    PlaywrightController --> AuditVault
    ChromeSession -->|Draw Entry & Checkout| NikeLaunchWeb
```

---

## 🎯 2. Nike Podium Design-System Selector Mapping

To ensure resilience against frequent CSS obfuscation, `bot/nikeBot.js` targets Nike's stable `data-qa` attributes:

| Intent | Primary Selector (`data-qa`) | Fallback Selectors |
| :--- | :--- | :--- |
| **Entry CTA** | `[data-qa="feed-card-cta"]`, `[data-qa="buy-now-button"]` | `button:has-text("เข้าร่วม")`, `button:has-text("ซื้อเลย")`, `button:has-text("Enter Draw")` |
| **Size Selector** | `[data-qa="size-selector"]` | `[data-qa="size-grid-modal"]`, `button[data-qa*="size"]` |
| **Draw Submit** | `[data-qa="draw-entry-button"]` | `button:has-text("ยืนยัน")`, `button:has-text("Submit Entry")` |
| **Checkout Next** | `[data-qa="save-and-continue-button"]` | `button:has-text("ดำเนินการต่อไป")` |
| **Order Place** | `[data-qa="order-review-submit-button"]` | `button:has-text("สั่งซื้อ")`, `button:has-text("Place Order")` |

---

## 🤖 3. Bot State Machine & Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Collector
    participant UI as Bot Control Panel
    participant Server as Express Server
    participant Bot as Playwright Bot Engine
    participant Chrome as Chrome CDP (:9222)
    participant Nike as Nike SNKRS TH

    User->>UI: Add "Travis Scott AJ1" to Watchlist with sizes [9, 9.5, 10]
    User->>UI: Click "Start Bot"
    UI->>Server: POST /api/bot/start (with watchlist)
    Server->>Bot: Initialize polling loop & attach CDP

    loop Every 2-5 Seconds
        Bot->>Server: Check countdown timer
    end

    Note over Bot,Chrome: Drop Goes Live (Launch Date Reached)
    Bot->>Chrome: Navigate to Product Page
    Bot->>Chrome: Wait for entry CTA button
    Bot->>Chrome: Click Entry CTA -> Size Modal Opens
    Bot->>Chrome: Select first available size from watchlist (e.g. US 9.5)
    Bot->>Chrome: Click "Enter Draw" / "Buy Now"
    Bot->>Chrome: Handle address/payment confirmation
    Bot->>Chrome: Capture execution audit screenshot
    Bot->>Server: Emit SSE Log: "✅ Draw entry submitted successfully!"
    Server-->>UI: Real-time console update + toast notification
```
