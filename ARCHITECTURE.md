# Nike SNKRS Tracker Architecture Specification

## 🏗️ 1. High-Level Architectural Design

**Nike SNKRS Tracker (SNKRS Radar)** combines an event-driven polling daemon, high-performance REST APIs, and a modern Next.js 16 Web Dashboard.

```mermaid
graph TD
    subgraph NikeIngress["1. Nike Thread V2 API Ingress"]
        NikeAPI["api.nike.com/product_feed/threads/v2/"]
        NikeTH["TH Marketplace (th/THB)"]
        NikeUS["US Marketplace (en/USD)"]
        NikeJP["JP Marketplace (ja/JPY)"]
    end

    subgraph PollingDaemon["2. High-Frequency Poller Daemon (src/scripts/run-monitor.ts)"]
        CronTimer["Configurable Jitter Timer (10-30s)"]
        Parser["JSON Thread Parser (src/lib/monitor/nike-scraper.ts)"]
        DiffEngine["State Diff & Restock Detector"]
    end

    subgraph DatabaseLayer["3. Prisma ORM & Database"]
        Prisma["Prisma 6.11 Client"]
        Database[("SQLite / PostgreSQL Database")]
    end

    subgraph DispatchTier["4. Notification Dispatch Pipeline"]
        Discord["Discord Webhook Embed"]
        Telegram["Telegram Channel Bot"]
        LINE["LINE Notify API"]
    end

    subgraph WebDashboard["5. Real-Time Web Dashboard (Next.js 16)"]
        Client["React 19 App Router UI"]
        APIRoute["/api/drops Route Handler"]
    end

    NikeTH --> NikeAPI
    NikeUS --> NikeAPI
    NikeJP --> NikeAPI
    NikeAPI --> CronTimer --> Parser --> DiffEngine

    DiffEngine --> Prisma --> Database
    DiffEngine -->|Trigger Alert| DispatchTier
    DispatchTier --> Discord
    DispatchTier --> Telegram
    DispatchTier --> LINE

    Database --> APIRoute --> Client
```

---

## ⚡ 2. Drop Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> UPCOMING: Scraper discovers new Thread object
    
    state UPCOMING {
        CountDown: Launch countdown active
        ShowDetails: Display MSRP, colorway, and launch type
    }
    
    UPCOMING --> ACTIVE: CurrentTime >= LaunchDate
    
    state ACTIVE {
        QueueOpen: DAN / LEO / FCFS live for checkout
        MonitorSizes: Poll availableSkus real-time
    }
    
    ACTIVE --> SOLD_OUT: All availableSkus.available == false
    
    state SOLD_OUT {
        WatchRestock: Continuous size stock monitoring
    }
    
    SOLD_OUT --> RESTOCKED: Any size becomes available
    RESTOCKED --> DispatchAlert: Send Discord/Telegram/LINE webhook
    DispatchAlert --> ACTIVE
```

---

## 🛡️ 3. Anti-Detection & Jitter Strategy

To ensure zero downtime and prevent IP bans from Nike CDN gateways:
1. **Randomized Request Jitter:** Intervals vary randomly between $T \pm 20\%$ seconds.
2. **User-Agent Fingerprint Rotation:** Rotates modern Chrome / Safari headers.
3. **Selective Query Parameters:** Queries strictly required fields (`productInfo`, `publishedContent`, `skus`) to minimize payload bandwidth.
