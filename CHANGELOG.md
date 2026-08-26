# Changelog

All notable changes to **Nike SNKRS Tracker** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-20

### Added
- **Multi-Region Scraper**: Automated ingestion from Nike Thread V2 cloud feed across Thailand (TH), United States (US), Japan (JP), and United Kingdom (GB).
- **Multi-Channel Webhook Dispatcher**: Instant alert broadcasts to Discord Rich Embeds, Telegram channels, and LINE Notify.
- **Stock Availability Matrix**: Real-time SKU stock level classification (HIGH, MEDIUM, LOW, OUT_OF_STOCK).
- **Web Dashboard**: Modern responsive UI built with Next.js 16, React 19, and Tailwind CSS v4.
- **Prisma Relational Database**: SQLite / PostgreSQL models for drops, size availability, restock audit logs, and user alerts.
