# Production Deployment & Operations Runbook

This guide covers running **Nike SNKRS Tracker & Auto-Buy Bot** in local and production environments.

---

## ⚡ Option 1: Local Automation (Recommended for Bot Usage)

Because the bot automates purchases via your authenticated local Google Chrome session, running locally ensures authentic browser fingerprints:

```bash
# 1. Install dependencies
npm install

# 2. Launch Chrome Remote Debugger
.\start_chrome_debug.ps1
# (or double click start_chrome_debug.bat)

# 3. Start Tracker & API Server
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)**.

---

## 🚀 Option 2: VPS Production Deployment (Monitoring Only)

For running a 24/7 background tracker with webhook alerts:

```bash
# 1. Clone repository
git clone https://github.com/Gubbitkeytoday/nike-snkrs-tracker.git /var/www/nike-snkrs
cd /var/www/nike-snkrs
npm install

# 2. Build Frontend
npm run build

# 3. Start Backend via PM2
pm2 start server.js --name snkrs-backend
pm2 start "npm run preview" --name snkrs-frontend
pm2 save
pm2 startup
```

---

## 🔍 Pre-Flight Verification Checklist

- [ ] Execute `npm install` and verify zero dependency conflicts.
- [ ] Confirm Chrome opens on port 9222 when running `start_chrome_debug.bat`.
- [ ] Verify `GET http://localhost:3001/api/in-stock` returns Nike products JSON.
- [ ] Test bot dry-run on an active item to confirm size picker interaction.
