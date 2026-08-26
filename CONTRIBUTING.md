# Contributing to Nike SNKRS Tracker

Thank you for contributing to **Nike SNKRS Tracker**!

---

## 🌿 Git Branching Strategy

- `feat/feature-name`: New marketplace regions, notification platforms, or UI views
- `fix/bug-name`: Scraper adjustments or parser bug fixes
- `perf/optimization`: Caching or rate limiting optimizations
- `docs/update`: Documentation improvements

---

## 💬 Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(scraper): add Nike Singapore (SG) marketplace feed
fix(discord): handle large size embed field overflow
perf(monitor): optimize memory footprint in long-running daemon
docs(readme): update webhook setup instructions
```

---

## 🛠️ Local Development & Pre-Flight Checklist

1. Clone and install dependencies: `npm install`
2. Initialize database: `npx prisma db push`
3. Launch dev server: `npm run dev`
4. Test monitor daemon: `npm run monitor`
