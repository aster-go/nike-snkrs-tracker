# Production Deployment Runbook

This guide covers deploying **Nike SNKRS Tracker** on VPS servers and Docker environments.

---

## ⚡ Option 1: Docker Compose (Recommended)

### 1. `docker-compose.yml`
```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./db/snkrs.db
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
      - MONITOR_INTERVAL_SECONDS=15
      - MONITOR_REGIONS=TH,US,JP
    restart: always
```

### 2. Deploy
```bash
docker compose up -d --build
```

---

## 🚀 Option 2: Linux VPS with PM2

```bash
# 1. Clone and install
git clone https://github.com/Gubbitkeytoday/nike-snkrs-tracker.git /var/www/nike-snkrs
cd /var/www/nike-snkrs
npm install
cp .env.example .env
# Edit .env with your webhooks

# 2. Setup database
npx prisma db push
npm run db:seed

# 3. Build & start services
npm run build
pm2 start "npm start" --name snkrs-web
pm2 start "npm run monitor" --name snkrs-daemon
pm2 save
pm2 startup
```

---

## 🔍 Pre-Flight Checklist

- [ ] Execute `npx prisma db push` to initialize schema.
- [ ] Confirm valid `DISCORD_WEBHOOK_URL` or `TELEGRAM_BOT_TOKEN` in `.env`.
- [ ] Test feed scraper: `npm run monitor` and verify logs output detected drops.
