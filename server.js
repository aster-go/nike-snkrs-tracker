const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const NIKE_BASE_URL = 'https://snkrs.services.nike.com/snkrs/content/v2/public/web/TH/th';

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://www.nike.com',
  'Referer': 'https://www.nike.com/',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

// Fetch a single page of in-stock products
app.get('/api/in-stock', async (req, res) => {
  try {
    const { page } = req.query;
    const url = page
      ? `${NIKE_BASE_URL}/in-stock?page=${page}`
      : `${NIKE_BASE_URL}/in-stock`;

    console.log(`[Nike API] Fetching: ${url}`);
    const response = await axios.get(url, {
      headers: REQUEST_HEADERS,
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Nike API',
      message: error.message,
      status: error.response?.status,
    });
  }
});

// Fetch all products across all pages (max 15 pages to avoid rate limiting)
app.get('/api/all-products', async (req, res) => {
  try {
    let allItems = [];
    let nextPage = null;
    let pageCount = 0;
    const MAX_PAGES = 15;

    do {
      const url = nextPage
        ? `${NIKE_BASE_URL}/in-stock?page=${nextPage}`
        : `${NIKE_BASE_URL}/in-stock`;

      console.log(`[Nike API] Fetching page ${pageCount + 1}: ${url}`);
      const response = await axios.get(url, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
      });

      const data = response.data;
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
      }

      nextPage = data.pagination?.next?.params?.page || null;
      pageCount++;

      // Small delay between requests to be respectful
      if (nextPage && pageCount < MAX_PAGES) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } while (nextPage && pageCount < MAX_PAGES);

    console.log(`[Nike API] Total items fetched: ${allItems.length} (${pageCount} pages)`);
    res.json({
      items: allItems,
      total: allItems.length,
      pages_fetched: pageCount,
      has_more: !!nextPage,
    });
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Nike API',
      message: error.message,
      status: error.response?.status,
    });
  }
});

// Fetch upcoming/launch products (single page)
app.get('/api/upcoming', async (req, res) => {
  try {
    const { page } = req.query;
    const url = page
      ? `${NIKE_BASE_URL}/upcoming?page=${page}`
      : `${NIKE_BASE_URL}/upcoming`;

    console.log(`[Nike API] Fetching upcoming: ${url}`);
    const response = await axios.get(url, {
      headers: REQUEST_HEADERS,
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Nike API',
      message: error.message,
    });
  }
});

// Fetch all upcoming products across all pages
app.get('/api/all-upcoming', async (req, res) => {
  try {
    let allItems = [];
    let nextPage = null;
    let pageCount = 0;
    const MAX_PAGES = 10;

    do {
      const url = nextPage
        ? `${NIKE_BASE_URL}/upcoming?page=${nextPage}`
        : `${NIKE_BASE_URL}/upcoming`;

      console.log(`[Nike API] Fetching upcoming page ${pageCount + 1}: ${url}`);
      const response = await axios.get(url, {
        headers: REQUEST_HEADERS,
        timeout: 15000,
      });

      const data = response.data;
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
      }

      nextPage = data.pagination?.next?.params?.page || null;
      pageCount++;

      if (nextPage && pageCount < MAX_PAGES) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } while (nextPage && pageCount < MAX_PAGES);

    console.log(`[Nike API] Total upcoming items: ${allItems.length} (${pageCount} pages)`);
    res.json({
      items: allItems,
      total: allItems.length,
      pages_fetched: pageCount,
      has_more: !!nextPage,
    });
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Nike API',
      message: error.message,
    });
  }
});

// Fetch individual thread/product detail
app.get('/api/thread/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const url = `${NIKE_BASE_URL}/thread/${threadId}`;
    console.log(`[Nike API] Fetching thread: ${threadId}`);
    const response = await axios.get(url, { headers: REQUEST_HEADERS, timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('[Nike API] Thread error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Nike product catalog search/browse
app.get('/api/search', async (req, res) => {
  try {
    const { q = '', country = 'TH', count = 24, anchor = 0 } = req.query;
    const filter = q
      ? `marketplace(${country})&filter=language(th)&queryid=productSearch&experienceType=snkrs&q=${encodeURIComponent(q)}`
      : `marketplace(${country})`;
    const url = `https://api.nike.com/product_feed/rollup_threads/v2/?anchor=${anchor}&count=${count}&filter=${filter}`;
    console.log(`[Nike Search] ${url}`);
    const response = await axios.get(url, {
      headers: { ...REQUEST_HEADERS, 'nike-api-caller-id': 'com.nike.commerce.snkrs.web' },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('[Nike Search] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch main feed (product-card + story-card + content-card, single page)
app.get('/api/feed', async (req, res) => {
  try {
    const { page } = req.query;
    const url = page
      ? `${NIKE_BASE_URL}/feed?page=${page}`
      : `${NIKE_BASE_URL}/feed`;

    console.log(`[Nike API] Fetching feed: ${url}`);
    const response = await axios.get(url, {
      headers: REQUEST_HEADERS,
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Nike API', message: error.message });
  }
});

// Fetch all feed pages (max 10 pages)
app.get('/api/all-feed', async (req, res) => {
  try {
    let allItems = [];
    let nextPage = null;
    let pageCount = 0;
    const MAX_PAGES = 10;

    do {
      const url = nextPage
        ? `${NIKE_BASE_URL}/feed?page=${nextPage}`
        : `${NIKE_BASE_URL}/feed`;

      console.log(`[Nike API] Fetching feed page ${pageCount + 1}: ${url}`);
      const response = await axios.get(url, { headers: REQUEST_HEADERS, timeout: 15000 });
      const data = response.data;

      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
      }

      nextPage = data.pagination?.next?.params?.page || null;
      pageCount++;
      if (nextPage && pageCount < MAX_PAGES) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } while (nextPage && pageCount < MAX_PAGES);

    console.log(`[Nike API] Feed total: ${allItems.length} items (${pageCount} pages)`);
    res.json({ items: allItems, total: allItems.length, pages_fetched: pageCount, has_more: !!nextPage });
  } catch (error) {
    console.error('[Nike API] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Nike API', message: error.message });
  }
});

// Real-time launch state from api.nike.com/launch/launch_views/v2/:launchId
app.get('/api/launch-state/:launchId', async (req, res) => {
  try {
    const { launchId } = req.params;
    const url = `https://api.nike.com/launch/launch_views/v2/${launchId}`;

    console.log(`[Nike Launch API] Fetching state: ${launchId}`);
    const response = await axios.get(url, {
      headers: {
        ...REQUEST_HEADERS,
        'nike-api-caller-id': 'com.nike.commerce.snkrs.web',
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    console.error('[Nike Launch API] Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch launch state',
      message: error.message,
    });
  }
});

// Batch launch states for multiple launch IDs
app.post('/api/launch-states', async (req, res) => {
  try {
    const { launchIds } = req.body;
    if (!Array.isArray(launchIds) || launchIds.length === 0) {
      return res.json({});
    }

    const results = {};
    await Promise.all(
      launchIds.slice(0, 20).map(async (id) => {
        try {
          const url = `https://api.nike.com/launch/launch_views/v2/${id}`;
          const response = await axios.get(url, {
            headers: { ...REQUEST_HEADERS, 'nike-api-caller-id': 'com.nike.commerce.snkrs.web' },
            timeout: 8000,
          });
          results[id] = response.data;
        } catch {
          results[id] = null;
        }
      })
    );

    res.json(results);
  } catch (error) {
    console.error('[Nike Launch API] Batch error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Bot endpoints ────────────────────────────────────────────────────────────
const bot = require('./bot/nikeBot');

// SSE stream for real-time bot logs
app.get('/api/bot/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const remove = bot.addLogListener((entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  req.on('close', remove);
});

app.get('/api/bot/status', (req, res) => {
  res.json(bot.getStatus());
});

app.post('/api/bot/start', async (req, res) => {
  const { profileDir } = req.body || {};
  try {
    bot.startBot(profileDir);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', (req, res) => {
  bot.stopBot();
  res.json({ ok: true });
});

app.post('/api/bot/watchlist/add', (req, res) => {
  const item = req.body;
  if (!item?.threadId || !item?.slug) {
    return res.status(400).json({ error: 'threadId and slug required' });
  }
  const watchlist = bot.addToWatchlist(item);
  res.json({ ok: true, watchlist });
});

app.delete('/api/bot/watchlist/:threadId', (req, res) => {
  const watchlist = bot.removeFromWatchlist(req.params.threadId);
  res.json({ ok: true, watchlist });
});

app.get('/api/bot/watchlist', (req, res) => {
  res.json(bot.getWatchlist());
});

// Launch Chrome with remote debugging port (so bot can connect via CDP)
app.post('/api/bot/launch-chrome', async (req, res) => {
  const { profileDir } = req.body || {};
  try {
    const pid = await bot.launchChromeDebug(profileDir);
    res.json({ ok: true, pid, message: 'Chrome กำลังเปิด — รอ 3 วินาทีแล้ว connect CDP อัตโนมัติ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Try to connect to existing Chrome via CDP
app.post('/api/bot/connect-cdp', async (req, res) => {
  try {
    const ok = await bot.connectCDP();
    if (ok) res.json({ ok: true, message: 'เชื่อมต่อ Chrome สำเร็จ!' });
    else res.status(400).json({ ok: false, message: 'ไม่พบ Chrome ที่เปิด debug port — กรุณากด Launch Chrome ก่อน' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Instant buy for in-stock products (non-blocking — runs in background)
app.post('/api/bot/buy-now', async (req, res) => {
  const item = req.body;
  if (!item?.slug) return res.status(400).json({ error: 'slug required' });
  // Respond immediately so UI doesn't hang; bot runs async
  res.json({ ok: true, message: `กำลังเปิด Chrome เพื่อซื้อ "${item.title}"...` });
  bot.buyNow(item).catch((err) => {
    console.error('[Bot] buyNow error:', err.message);
  });
});

// Serve React build in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Nike SNKRS Tracker server running at http://localhost:${PORT}`);
  console.log(`   API endpoints:`);
  console.log(`   - GET  /api/in-stock               (in-stock first page)`);
  console.log(`   - GET  /api/all-products            (in-stock all pages)`);
  console.log(`   - GET  /api/upcoming                (upcoming first page)`);
  console.log(`   - GET  /api/all-upcoming            (upcoming all pages)`);
  console.log(`   - GET  /api/feed                    (main feed first page)`);
  console.log(`   - GET  /api/all-feed                (main feed all pages)`);
  console.log(`   - GET  /api/launch-state/:launchId  (real-time launch state)`);
  console.log(`   - POST /api/launch-states           (batch launch states)\n`);
});
