/**
 * Nike SNKRS Auto-Entry Bot — Playwright + Existing Chrome Profile
 *
 * Launch types handled:
 *  DAN  (Draw and Notify)    10-30 min window, timer visible, speed irrelevant
 *  LEO  (Let Everyone Order) 2-3 min window, no timer, moderate speed
 *  FLOW (First Come First)   direct purchase, speed critical → full checkout
 *
 * Selectors sourced from Nike's Podium design system (data-qa attributes)
 * and confirmed against live Nike SNKRS TH DOM structure.
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const CHROME_PATH = process.env.CHROME_EXE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const DEFAULT_PROFILE_DIR = process.env.CHROME_PROFILE ||
  'C:\\ChromeBotProfile'  // Dedicated bot profile — no spaces, no policy conflicts

// ── State ────────────────────────────────────────────────────────────────────
let browserContext = null
let isRunning = false
let watchlist = []        // [{ threadId, slug, title, sizes, launchId, launchMethod, maxPrice }]
let logListeners = []     // SSE clients
let botStatus = 'idle'    // idle | running | error
let completedTasks = []   // completed/failed tasks
let pollTimer = null

// Human-like random delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = (min, max) => sleep(min + Math.floor(Math.random() * (max - min)))

// ─────────────────────────────────────────────────────────────────────────────
// Nike SNKRS Podium design-system selectors (data-qa — most stable across
// deploys; CSS class names regenerate on every build)
// Verified against nike.com/th/launch structure, April 2025
// ─────────────────────────────────────────────────────────────────────────────
const SEL = {
  // ── Entry / CTA button — triggers size modal or goes to product page ────
  // NOTE: Do NOT include 'Add to Bag' / 'เพิ่มในตะกร้า' here; those appear AFTER size
  entryCta: [
    '[data-qa="feed-card-cta"]',
    '[data-qa="cta-button"]',
    '[data-qa="buy-now-button"]',
    '[data-qa="launch-cta"]',
    '[data-qa="shop-btn"]',
    'button:has-text("\u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21")',       // เข้าร่วม
    'button:has-text("\u0e0b\u0e37\u0e49\u0e2d\u0e40\u0e25\u0e22")',            // ซื้อเลย
    'button:has-text("Enter Draw")',
    'button:has-text("Buy Now")',
    'button:has-text("Shop")',
    'button:has-text("Select Size")',
  ],

  // ── Size grid / bottom-sheet ─────────────────────────────────────────────
  sizeSheet: [
    '[data-qa="size-selector"]',
    '[data-qa="size-dropdown"]',
    '[data-qa="size-selector-container"]',
    '.size-selector',
    'fieldset:has(button)',
  ].join(', '),
  // Each size button — many possible patterns on Nike TH
  sizeBtn: [
    'li[data-qa^="size-selector-li"] button:not([disabled])',
    '[data-qa^="size-selector"] button:not([disabled])',
    'button[data-qa^="size"]:not([disabled])',
    'fieldset button:not([disabled])',
    '.size-selector button:not([disabled])',
  ],

  // ── Confirm / Add to Bag after size chosen ───────────────────────────────
  // Ordered by likelihood — most common Nike TH pattern first
  confirm: [
    'button:has-text("ซื้อ ฿")',                   // ซื้อ ฿X,XXX — PRIMARY Nike TH buy button
    'button:has-text("ซื้อเลย")',         // ซื้อเลย
    'button:has-text("เพิ่มในตะกร้า")',  // เพิ่มในตะกร้า
    'button:has-text("Add to Bag")',
    'button:has-text("ยืนยัน")',
    'button:has-text("Confirm")',
    '[data-qa="add-to-bag"]',
    '[data-qa="add-to-bag-btn"]',
    '[data-qa="confirm-cta"]',
    '[data-qa="atc-btn"]',
  ],

  // ── Cart page (/th/cart) ─────────────────────────────────────────────────
  // NOTE: Nike TH shows "สมาชิกเช็คเอาท์" (Member Checkout) as primary CTA
  cartCheckoutBtn: [
    '[data-qa="checkout-btn"]',
    '[data-qa="cart-checkout-btn"]',
    '[data-qa="member-checkout"]',
    'button:has-text("สมาชิกเช็คเอาท์")',  // Member Checkout — primary Nike TH button
    'button:has-text("เช็คเอาท์")',
    'button:has-text("ชำระเงิน")',
    'button:has-text("Checkout")',
    'a:has-text("สมาชิกเช็คเอาท์")',
    'a:has-text("Checkout")',
    'a:has-text("ชำระเงิน")',
  ],

  // ── Checkout page — Nike TH uses gs-checkout.nike.com/buy/th/th-th/{token} ─────────
  // IMPORTANT: only appears AFTER address is saved + shipping section loads
  // DO NOT use button[type="submit"]:visible — too broad
  placeOrder: [
    '[data-qa="place-order-btn"]',
    '[data-qa="submit-order"]',
    '[data-qa="payment-submit"]',
    '[data-qa="review-order-submit"]',
    '[data-qa="checkout-submit"]',
    'button:has-text("สั่งซื้อ")',
    'button:has-text("ยืนยันคำสั่งซื้อ")',
    'button:has-text("Place Order")',
    'button:has-text("จัดส่ง")',                  // จัดส่ง (Deliver)
  ],

  // ── gs-checkout.nike.com address form detection ──────────────────────────────
  // If visible, address is empty and bot CANNOT place order
  addressRequired: [
    'input[name="firstName"], input[placeholder*="\u0e0a\u0e37\u0e48\u0e2d"]',
    'input[name="address1"]',
    'input[autocomplete="given-name"]',
  ],
}

// ── Logging ──────────────────────────────────────────────────────────────────
function log(level, msg, data = null) {
  const entry = { level, msg, data, time: new Date().toISOString() }
  console.log(`[Bot][${level.toUpperCase()}] ${msg}`, data ? JSON.stringify(data) : '')
  logListeners.forEach((send) => {
    try { send(entry) } catch {}
  })
}

function addLogListener(sendFn) {
  logListeners.push(sendFn)
  return () => { logListeners = logListeners.filter((l) => l !== sendFn) }
}

// ── Screenshots ───────────────────────────────────────────────────────────────
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function screenshot(page, name) {
  try {
    const file = path.join(SCREENSHOT_DIR, `${name}_${Date.now()}.png`)
    await page.screenshot({ path: file, fullPage: false })
    log('info', `Screenshot: ${path.basename(file)}`)
  } catch {}
}

const CDP_PORT = process.env.CDP_PORT || 9222
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`  // Force IPv4 — Chrome listens on 127.0.0.1, not ::1
const APP_PORT = process.env.APP_PORT || 5174  // Vite dev = 5174, production = 3001
let cdpBrowser = null  // CDP-connected browser (separate from browserContext)

// ── Launch Chrome with remote debugging port (call this ONCE, then keep Chrome open) ──
async function launchChromeDebug(profileDir = DEFAULT_PROFILE_DIR) {
  const { spawn, execSync } = require('child_process')

  // Kill any existing Chrome using this profile (frees the profile lock)
  try {
    execSync('taskkill /f /im chrome.exe', { stdio: 'ignore' })
    log('info', 'ปิด Chrome เดิมแล้ว — รอ 1 วินาที...')
    await sleep(1000)
  } catch {
    log('info', 'ไม่มี Chrome ที่ต้องปิด')
  }

  log('info', `🚀 เปิด Chrome debug mode (port ${CDP_PORT}) + แอป...`)

  const appUrl = `http://localhost:${APP_PORT}`
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    // Anti-detection
    '--disable-blink-features=AutomationControlled',
    // Speed flags — reduce background overhead on Nike pages
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    appUrl,
  ]

  const proc = spawn(CHROME_PATH, args, { detached: true, stdio: 'ignore' })
  proc.unref()
  log('info', `Chrome (pid=${proc.pid}) เปิดแล้ว — รอ 3 วินาที เพื่อให้ Chrome เริ่มต้น...`)
  await sleep(3000)
  return proc.pid
}

// ── Connect to Chrome via CDP (Chrome must be running with --remote-debugging-port) ──
async function connectCDP() {
  try {
    log('info', `🔌 เชื่อมต่อ Chrome via CDP: ${CDP_URL}`)
    cdpBrowser = await chromium.connectOverCDP(CDP_URL)
    const contexts = cdpBrowser.contexts()
    // Use first context (the user's real browsing context with Nike session)
    browserContext = contexts.length > 0 ? contexts[0] : await cdpBrowser.newContext()
    log('info', `✔ CDP เชื่อมต่อแล้ว (${contexts.length} contexts, ${browserContext.pages().length} pages)`)
    return true
  } catch (err) {
    log('error', `CDP เชื่อมต่อไม่ได้: ${err.message}`)
    log('warn', `ตรวจสอบว่า Chrome ถูกเปิดด้วย debug port หรือไม่`)
    return false
  }
}

async function launchBrowser(profileDir = DEFAULT_PROFILE_DIR) {
  // Try CDP first (Chrome already running with debug port)
  const cdpOk = await connectCDP()
  if (cdpOk) return browserContext

  // CDP failed — launch Chrome in debug mode, then reconnect
  log('info', 'CDP ไม่พบ — เปิด Chrome debug mode ใหม่...')
  await launchChromeDebug(profileDir)
  const ok = await connectCDP()
  if (!ok) throw new Error(`ไม่สามารถเชื่อมต่อ Chrome ได้ — ตรวจสอบว่า Chrome เปิดเรียบร้อย`)
  return browserContext
}

async function closeBrowser() {
  if (cdpBrowser) {
    try { await cdpBrowser.close() } catch {}
    cdpBrowser = null
    browserContext = null
    log('info', 'CDP disconnect แล้ว')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

async function findAndClick(page, selectors, timeoutMs = 3000) {
  // Phase 1: try combined selector (all at once — fastest)
  const combined = selectors.join(', ')
  try {
    const loc = page.locator(combined).first()
    await loc.waitFor({ state: 'visible', timeout: timeoutMs })
    if (!await loc.isDisabled()) {
      const text = (await loc.textContent({ timeout: 500 }))?.trim()
      log('info', `\u2714 \u0e04\u0e25\u0e34\u0e01: "${text}"`)
      await loc.click()
      return { clicked: true, text }
    }
  } catch {}

  // Phase 2: fallback — try each selector individually with short probe
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first()
      await loc.waitFor({ state: 'visible', timeout: 500 })
      if (await loc.isDisabled()) continue
      const text = (await loc.textContent({ timeout: 300 }))?.trim()
      log('info', `\u2714 \u0e04\u0e25\u0e34\u0e01 (fallback): "${text}" [${sel}]`)
      await loc.click()
      return { clicked: true, text }
    } catch {}
  }
  return { clicked: false }
}

// Dump all visible buttons for debugging when selectors fail
async function dumpButtons(page) {
  try {
    const btns = await page.locator('button:visible').all()
    const texts = []
    for (const b of btns.slice(0, 30)) {
      try {
        const t = (await b.textContent({ timeout: 500 }))?.trim()
        const qa = await b.getAttribute('data-qa').catch(() => null)
        if (t) texts.push(qa ? `[${qa}]"${t}"` : `"${t}"`)
      } catch {}
    }
    log('warn', `\ud83d\udd0d Buttons visible (${texts.length}): ${texts.join(' | ')}`)
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Size selector — tries multiple selector patterns for Nike SNKRS TH
// ─────────────────────────────────────────────────────────────────────────────
async function selectSize(page, preferredSizes = [], timeoutMs = 6000) {
  // 1. Race all selector patterns simultaneously — fastest wins
  const combined = SEL.sizeBtn.join(', ')
  const foundSizeBtn = await page.waitForSelector(combined, { timeout: timeoutMs })
    .then(() => true).catch(() => false)

  if (!foundSizeBtn) {
    await dumpButtons(page)
    log('info', '\u0e44\u0e21\u0e48\u0e1e\u0e1a size button \u2014 \u0e2a\u0e31\u0e19\u0e19\u0e34\u0e29\u0e10\u0e32\u0e19 ONE_SIZE')
    return { selected: true, chosen: 'ONE_SIZE', available: [] }
  }
  // No jitter — collect immediately

  // 2. Collect all available size buttons across ALL selector patterns
  const available = []
  const seen = new Set()
  for (const sel of SEL.sizeBtn) {
    try {
      const btns = await page.locator(sel).all()
      for (const btn of btns) {
        try {
          if (await btn.isDisabled()) continue
          const text = (await btn.textContent({ timeout: 500 }))?.trim()
          const ariaLabel = (await btn.getAttribute('aria-label'))?.trim() || ''
          const key = text || ariaLabel
          if (key && !seen.has(key)) {
            seen.add(key)
            available.push({ btn, text: text || ariaLabel, ariaLabel })
          }
        } catch {}
      }
    } catch {}
  }

  log('info', `\u0e44\u0e0b\u0e2a\u0e4c\u0e17\u0e35\u0e48\u0e21: [${available.map((a) => a.text).join(', ')}]`)

  if (available.length === 0) {
    await dumpButtons(page)
    return { selected: false, reason: 'all_oos', available: [] }
  }

  // 3. Match preferred sizes (case-insensitive, strip "US ", "M ", leading zeros)
  const normalize = (s) => String(s).toLowerCase().trim()
    .replace(/^us\s*/i, '').replace(/^m\s*/i, '').replace(/\.0$/, '')

  for (const pref of preferredSizes) {
    const prefNorm = normalize(pref)
    for (const { btn, text, ariaLabel } of available) {
      const tNorm  = normalize(text)
      const aNorm  = normalize(ariaLabel)
      if (tNorm === prefNorm || tNorm.includes(prefNorm) || aNorm.includes(prefNorm)) {
        await btn.click()
        log('info', `\u2714 \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e0b\u0e2a\u0e4c: "${text}" (\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23: "${pref}")`)
        return { selected: true, chosen: text, available: available.map((a) => a.text) }
      }
    }
  }

  log('warn', `\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e44\u0e0b\u0e2a\u0e4c [${preferredSizes.join(', ')}] \u2014 Fallback \u0e44\u0e0b\u0e2a\u0e4c\u0e41\u0e23\u0e01`)
  // 4. Fallback: first available
  await available[0].btn.click()
  log('info', `\u26a1 Fallback \u0e44\u0e0b\u0e2a\u0e4c: ${available[0].text}`)
  return { selected: true, chosen: available[0].text, available: available.map((a) => a.text) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-like type into an Angular input — bypasses Forter behavioral detection
// Dispatches 'input' + 'change' events required by Angular ngModel
// ─────────────────────────────────────────────────────────────────────────────
async function humanType(page, selectors, value) {
  if (!value) return false
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first()
      if (await loc.count() === 0) continue
      // 1. Click to focus
      await loc.click()
      await sleep(80 + Math.random() * 80)
      // 2. Clear existing value
      await page.keyboard.press('Control+A')
      await sleep(30)
      await page.keyboard.press('Backspace')
      await sleep(50)
      // 3. Type char by char with random delay (evades Forter timing analysis)
      for (const ch of value) {
        await page.keyboard.type(ch, { delay: 20 + Math.random() * 60 })
      }
      await sleep(60)
      // 4. Dispatch Angular input + change events (ngModel needs these)
      await loc.evaluate((el) => {
        el.dispatchEvent(new Event('input',  { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })
      // 5. Tab out — Angular reactive forms need a REAL focus transition to validate
      // Synthetic blur event alone is NOT enough; Tab triggers the actual ControlValueAccessor
      await page.keyboard.press('Tab')
      await sleep(80)
      log('info', `  \u2714 typed "${value}" \u2192 ${sel}`)
      return true
    } catch {}
  }
  log('warn', `  \u2718 \u0e44\u0e21\u0e48\u0e1e\u0e1a field \u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a: ${selectors[0]}`)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Select wallet in ESW payment iframe (payments-panel.production.eshopworld.com)
// Nike TH uses ESW cross-origin iframe for all payment methods
// ─────────────────────────────────────────────────────────────────────────────
async function selectPaymentWallet(page) {
  log('info', '\ud83d\udcb3 \u0e04\u0e49\u0e19\u0e2b\u0e32 ESW payment iframe...')
  try {
    // Wait for ESW iframe to appear
    await page.waitForSelector(
      'iframe[src*="payments-panel.production.eshopworld.com"], iframe[src*="eshopworld"], iframe[title*="payment"], iframe[title*="Payment"]',
      { timeout: 12000 }
    )
  } catch {
    log('warn', 'ESW iframe \u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e20\u0e32\u0e22\u0e43\u0e19 12 \u0e27\u0e34 \u2014 \u0e25\u0e2d\u0e07\u0e15\u0e48\u0e2d')
    return false
  }

  // Try each iframe on the page
  const frames = page.frames()
  for (const frame of frames) {
    const src = frame.url()
    if (!src.includes('eshopworld') && !src.includes('payments-panel')) continue
    log('info', `\u2714 ESW iframe found: ${src}`)

    // ── Click "Wallet" / saved card option ──────────────────────────────────
    const walletSelectors = [
      '[data-qa="wallet-payment-method"]',
      '[data-qa="saved-card"]',
      'button:has-text("Wallet")',
      'button:has-text("\u0e27\u0e2d\u0e40\u0e25\u0e15")',            // วอเลต
      'button:has-text("\u0e1a\u0e31\u0e15\u0e23\u0e17\u0e35\u0e48\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01")', // บัตรที่บันทึก
      '[class*="wallet"]',
      '[class*="savedCard"]',
      'input[type="radio"][value*="wallet"]',
      'input[type="radio"][value*="saved"]',
    ]
    for (const sel of walletSelectors) {
      try {
        const el = frame.locator(sel).first()
        if (await el.count() > 0) {
          await el.click()
          log('info', `  \u2714 \u0e40\u0e25\u0e37\u0e2d\u0e01 wallet: ${sel}`)
          await sleep(300)
          return true
        }
      } catch {}
    }

    // Dump payment options for debugging
    const payBtns = await frame.locator('button, input[type="radio"], [role="radio"]').all()
    log('info', `ESW iframe buttons (${payBtns.length}):`)
    for (const b of payBtns.slice(0, 15)) {
      const txt = await b.innerText().catch(() => '')
      const val = await b.getAttribute('value').catch(() => '')
      log('info', `  • "${txt || val}"`)
    }
    return false
  }
  log('warn', '\u0e44\u0e21\u0e48\u0e1e\u0e1a ESW iframe \u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a')
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-fill address + trigger payment selection on gs-checkout.nike.com
// profile: { firstName, lastName, address1, address2, phone, postalCode }
// ─────────────────────────────────────────────────────────────────────────────
async function fillCheckoutAddress(page, profile) {
  log('info', '\ud83d\udcdd \u0e01\u0e23\u0e2d\u0e01 address \u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34 (human-like typing)...')

  // ── Wait for Angular ESW form to ACTUALLY render ────────────────────────────
  // Angular makes API calls after domcontentloaded — form appears much later.
  // Wait for the ชื่อ input to be visible before doing anything.
  log('info', '\u23f3 \u0e23\u0e2d Angular \u0e23\u0e2d form render (\u0e23\u0e2d field \u0e0a\u0e37\u0e48\u0e2d)...')
  const FORM_READY_SEL = [
    'input[placeholder*="\u0e0a\u0e37\u0e48\u0e2d"]',    // ชื่อ
    'input[placeholder="\u0e0a\u0e37\u0e48\u0e2d *"]',
    'input[placeholder*="\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25"]', // นามสกุล
  ].join(', ')
  try {
    await page.waitForSelector(FORM_READY_SEL, { timeout: 25000 })
    log('info', '\u2714 Form \u0e23\u0e2d\u0e41\u0e25\u0e49\u0e27 — \u0e40\u0e23\u0e34\u0e48\u0e21\u0e01\u0e23\u0e2d\u0e01')
  } catch {
    log('warn', 'Form \u0e44\u0e21\u0e48\u0e1b\u0e23\u0e32\u0e01\u0e43\u0e19 25\u0e27\u0e34 \u2014 \u0e14\u0e39 input dump \u0e02\u0e49\u0e32\u0e07\u0e25\u0e48\u0e32\u0e07')
  }
  await sleep(200)

  // ── Dump all visible inputs for debugging ────────────────────────────────────
  try {
    const inputs = await page.locator('input:visible').all()
    log('info', `\ud83d\udd0d inputs \u0e17\u0e35\u0e48\u0e1e\u0e1a (${inputs.length}):`)
    for (const inp of inputs.slice(0, 20)) {
      const n   = await inp.getAttribute('name').catch(() => '')
      const ph  = await inp.getAttribute('placeholder').catch(() => '')
      const fc  = await inp.getAttribute('formcontrolname').catch(() => '')
      const id  = await inp.getAttribute('id').catch(() => '')
      const ac  = await inp.getAttribute('autocomplete').catch(() => '')
      const typ = await inp.getAttribute('type').catch(() => '')
      log('info', `  input name="${n}" formcontrolname="${fc}" id="${id}" placeholder="${ph}" autocomplete="${ac}" type="${typ}"`)
    }
  } catch {}

  // ── Select "ส่งที่บ้าน" tab (home delivery) ──────────────────────────────────
  try {
    const homeTab = page.locator([
      'button:has-text("\u0e2a\u0e48\u0e07\u0e17\u0e35\u0e48\u0e1a\u0e49\u0e32\u0e19")',   // ส่งที่บ้าน
      'button:has-text("\u0e02\u0e19\u0e2a\u0e48\u0e07")',                  // ขนส่ง
      '[data-qa="delivery-option-shipping"]',
    ].join(', ')).first()
    if (await homeTab.count() > 0) {
      await homeTab.click()
      log('info', '  \u2714 \u0e40\u0e25\u0e37\u0e2d\u0e01 \u0e2a\u0e48\u0e07\u0e17\u0e35\u0e48\u0e1a\u0e49\u0e32\u0e19')
      await sleep(400)
    }
  } catch {}

  // ── 1. ชื่อ (First name) ──────────────────────────────────────────────────
  // ESW Angular uses placeholder="ชื่อ *" NOT name="firstName"
  await humanType(page, [
    'input[placeholder="\u0e0a\u0e37\u0e48\u0e2d *"]',
    'input[placeholder*="\u0e0a\u0e37\u0e48\u0e2d"]',
    'input[name="firstName"]', 'input[autocomplete="given-name"]',
  ], profile.firstName)
  await sleep(100)

  // ── 2. นามสกุล (Last name) ───────────────────────────────────────────────
  await humanType(page, [
    'input[placeholder="\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25 *"]',
    'input[placeholder*="\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25"]',
    'input[name="lastName"]', 'input[autocomplete="family-name"]',
  ], profile.lastName)
  await sleep(100)

  // ── 3. District address entry ────────────────────────────────────────────────
  // ESW TH checkout has TWO modes:
  //   A) "ค้นหาตำบล" autocomplete  ← type subdistrict name or postal code → pick dropdown
  //   B) "ค้นหาด้วยรหัสไปรษณีย์" link → switches to postal+province dropdown mode
  // We try A first; if no dropdown appears within 2.5s, click the postal code link (B).
  // NOTE: Do NOT include "รหัสไปรษณีย์" in districtSearch selector — it matches the wrong field!

  // ── 3a. Find the district autocomplete input (ค้นหาตำบล only) ─────────────
  log('info', '\ud83d\udd0d \u0e04\u0e49\u0e19\u0e2b\u0e32 district autocomplete (ค้นหาตำบล)...')
  const districtSearch = page.locator([
    'input[placeholder*="\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e15\u0e33\u0e1a\u0e25"]',  // ค้นหาตำบล
    'input[placeholder*="\u0e15\u0e33\u0e1a\u0e25/\u0e2d\u0e33\u0e40\u0e20\u0e2d"]', // ตำบล/อำเภอ
  ].join(', ')).first()

  // Dump ALL visible inputs at this point to debug
  try {
    const allInputs = await page.locator('input:visible').all()
    log('info', `  \u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 inputs (${allInputs.length}):`)
    for (const inp of allInputs.slice(0, 15)) {
      const ph = await inp.getAttribute('placeholder').catch(() => '')
      const nm = await inp.getAttribute('name').catch(() => '')
      log('info', `    • name="${nm}" placeholder="${ph}"`)
    }
  } catch {}

  let districtPicked = false

  if (await districtSearch.count() > 0) {
    // ── Mode A: Autocomplete ───────────────────────────────────────────────
    await districtSearch.click()
    await sleep(300)
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await sleep(60)

    // Type postalCode — triggers ESW's district API call
    for (const ch of (profile.postalCode || '')) {
      await page.keyboard.type(ch, { delay: 80 + Math.random() * 80 })
    }
    await districtSearch.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
    })
    log('info', `  \u0e1e\u0e34\u0e21\u0e1e\u0e4c "${profile.postalCode}" \u0e43\u0e19 autocomplete`)

    // Wait up to 3s for a listbox/option to appear
    const OPTION_SEL = '[role="option"], [role="listbox"] li, mat-option, .mat-option'
    const dropdownAppeared = await page.waitForSelector(OPTION_SEL, { timeout: 3000 })
      .then(() => true).catch(() => false)

    await screenshot(page, 'fill_district_dropdown')

    if (dropdownAppeared) {
      // Dump all options for debug
      const opts = await page.locator(OPTION_SEL).all()
      log('info', `  dropdown \u0e42\u0e1a\u0e1a\u0e02\u0e36\u0e49\u0e19 (${opts.length}):`)
      for (const o of opts.slice(0, 8)) {
        log('info', `    • "${await o.innerText().catch(() => '')}"`)
      }
      // Click first option
      const firstOpt = page.locator(OPTION_SEL).first()
      const txt = await firstOpt.innerText().catch(() => '')
      await firstOpt.click()
      log('info', `  \u2714 \u0e40\u0e25\u0e37\u0e2d\u0e01: "${txt}"`)
      districtPicked = true
      await sleep(800)
    } else {
      log('warn', '  dropdown \u0e44\u0e21\u0e48\u0e42\u0e1a\u0e1a\u0e02\u0e36\u0e49\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19 3\u0e27\u0e34 \u2014 \u0e25\u0e2d\u0e07 ArrowDown')
      await page.keyboard.press('ArrowDown')
      await sleep(400)
      await screenshot(page, 'fill_district_arrow')
      await page.keyboard.press('Enter')
      await sleep(600)
      districtPicked = true
    }
  }

  // ── 3b. Postal-code link mode (fallback or primary if no autocomplete field) ──
  if (!districtPicked) {
    log('info', '  \u0e25\u0e2d\u0e07\u0e01\u0e14 "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e14\u0e49\u0e27\u0e22\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c" link...')
    const postalLink = page.locator([
      'a:has-text("\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c")',
      'button:has-text("\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c")',
      '[class*="postal"]', '[data-qa*="postal"]',
    ].join(', ')).first()
    if (await postalLink.count() > 0) {
      await postalLink.click()
      log('info', '  \u2714 \u0e2a\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e42\u0e2b\u0e21\u0e14 postal code')
      await sleep(500)
    }
  }

  // ── 3c. Fill postal code input (appears in both modes) ─────────────────────
  const postalInput = page.locator([
    'input[placeholder*="\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c"]',
    'input[name="postalCode"]', 'input[name="zipCode"]', 'input[autocomplete="postal-code"]',
  ].join(', ')).first()
  if (await postalInput.count() > 0) {
    await humanType(page, [
      'input[placeholder*="\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c"]',
      'input[name="postalCode"]', 'input[autocomplete="postal-code"]',
    ], profile.postalCode)
    log('info', `  \u0e01\u0e23\u0e2d\u0e01 postalCode: ${profile.postalCode}`)
    await sleep(300)
  }

  // ── 3d. Select province from dropdown (if visible) ──────────────────────────
  const provinceDropdown = page.locator([
    'select[placeholder*="\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14"]',
    'select[name*="province"]', 'select[name*="Province"]',
    'select[name*="region"]', 'select:visible',
  ].join(', ')).first()
  if (await provinceDropdown.count() > 0) {
    try {
      // Select the province option matching profile
      const options = await provinceDropdown.locator('option').all()
      let matched = false
      for (const opt of options) {
        const txt = await opt.innerText().catch(() => '')
        if (txt.includes('\u0e1b\u0e23\u0e30\u0e08\u0e27\u0e1a') || (profile.postalCode && txt.includes(profile.postalCode))) {
          const val = await opt.getAttribute('value').catch(() => null)
          if (val) await provinceDropdown.selectOption(val)
          log('info', `  \u2714 \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14: "${txt}"`)
          matched = true
          break
        }
      }
      if (!matched && options.length > 1) {
        // Just select first non-empty option
        const val = await options[1].getAttribute('value').catch(() => null)
        if (val) await provinceDropdown.selectOption(val)
        log('info', '  \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14 (fallback option 1)')
      }
      await sleep(400)
    } catch (e) {
      log('warn', `  Province dropdown error: ${e.message}`)
    }
  }
  await screenshot(page, 'fill_after_district')

  // ── 4. ที่อยู่ (Street address/house number) ──────────────────────────────
  // Appears AFTER district selection on ESW form
  await sleep(300)
  await humanType(page, [
    'input[placeholder*="\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48"]',        // ที่อยู่
    'input[placeholder*="\u0e1a\u0e49\u0e32\u0e19\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48"]',   // บ้านเลขที่
    'input[placeholder*="\u0e16\u0e19\u0e19"]',                        // ถนน
    'input[name="addressLine1"]', 'input[name="address1"]',
    'input[autocomplete="address-line1"]',
  ], profile.address1)
  await sleep(100)

  // ── 5. เบอร์โทร (Phone) ───────────────────────────────────────────────────
  await humanType(page, [
    'input[placeholder*="\u0e40\u0e1a\u0e2d\u0e23\u0e4c\u0e42\u0e17\u0e23"]',  // เบอร์โทร
    'input[placeholder*="\u0e42\u0e17\u0e23"]',                        // โทร
    'input[placeholder*="\u0e40\u0e1a\u0e2d\u0e23\u0e4c"]',                     // เบอร์
    'input[type="tel"]', 'input[name="phoneNumber"]', 'input[name="phone"]',
  ], profile.phone)
  await sleep(200)

  // ── Screenshot after fill ─────────────────────────────────────────────────
  await screenshot(page, 'fill_form_done')

  // ── 6. Click Continue / Save ──────────────────────────────────────────────
  const continueBtn = [
    '[data-qa="delivery-continue"]',
    'button:has-text("\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e15\u0e48\u0e2d")',  // ดำเนินการต่อ
    'button:has-text("Continue")',
    'button:has-text("\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01")',         // บันทึก
    'button:has-text("\u0e08\u0e31\u0e14\u0e2a\u0e48\u0e07")',         // จัดส่ง
    'button[type="submit"]',
  ]
  await sleep(400)
  const cont = await findAndClick(page, continueBtn, 8000)
  if (cont.clicked) log('info', `  \u2714 \u0e01\u0e14 continue: "${cont.text}"`)

  // ── Wait for payment section to appear ────────────────────────────────────
  log('info', '\u0e23\u0e2d\u0e2b\u0e19\u0e49\u0e32 payment \u0e42\u0e2b\u0e25\u0e14...')
  await sleep(800)

  // ── Select wallet in ESW iframe ───────────────────────────────────────────
  await selectPaymentWallet(page)

  log('info', '\ud83d\udcdd \u0e01\u0e23\u0e2d\u0e01 checkout form \u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27')
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW (First Come First Served) — full checkout after Add to Bag
// ─────────────────────────────────────────────────────────────────────────────
async function handleFlowCheckout(page, slug, checkoutProfile = null) {
  log('info', 'FLOW: \u0e44\u0e1b\u0e2b\u0e19\u0e49\u0e32 cart...')

  // ── Step 1: Get to cart page ──────────────────────────────────────────────
  // After clicking "ซื้อ ฿", wait for auto-redirect to cart first
  try {
    await page.waitForURL(/\/cart/, { timeout: 6000 })
    log('info', `\u2714 Auto-redirect \u0e44\u0e1b cart: ${page.url()}`)
  } catch {
    // Not redirected — navigate to cart manually
    log('info', '\u0e44\u0e21\u0e48 redirect \u2014 \u0e19\u0e33\u0e17\u0e32\u0e07\u0e44\u0e1b cart')
    await navigateTo(page, 'https://www.nike.com/th/cart')
  }

  await screenshot(page, `flow_cart_${slug}`)
  log('info', `Cart URL: ${page.url()}`)

  // ── Step 2: Wait for "สมาชิกเช็คเอาท์" and click it ─────────────────────
  // Nike requires this button click — cannot skip to checkout directly
  log('info', '\u0e23\u0e2d\u0e1b\u0e38\u0e48\u0e21 \u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e40\u0e0a\u0e47\u0e04\u0e40\u0e2d\u0e32\u0e17\u0e4c...')
  const cartResult = await findAndClick(page, SEL.cartCheckoutBtn, 12000)
  if (!cartResult.clicked) {
    log('warn', '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1b\u0e38\u0e48\u0e21 \u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e40\u0e0a\u0e47\u0e04\u0e40\u0e2d\u0e32\u0e17\u0e4c \u2014 buttons \u0e17\u0e35\u0e48\u0e21\u0e35:')
    await dumpButtons(page)
    await screenshot(page, `flow_cart_no_checkout_${slug}`)
    return { success: false, reason: 'no_cart_checkout_btn' }
  }
  log('info', `\u2714 \u0e01\u0e14: "${cartResult.text}"`)

  // ── Step 3: Wait for gs-checkout.nike.com OR /checkout URL ───────────────────
  // Nike TH redirects to: gs-checkout.nike.com/buy/th/th-th/{token}
  // NOT to: nike.com/th/checkout
  try {
    await page.waitForURL(
      (url) => url.includes('gs-checkout.nike.com') || url.includes('/checkout'),
      { timeout: 15000 }
    )
    log('info', `\u2714 Checkout URL: ${page.url()}`)
  } catch {
    log('warn', `\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e1b checkout: ${page.url()}`)
  }

  await sleep(500)
  await screenshot(page, `flow_checkout_${slug}`)
  log('info', `Checkout domain: ${page.url()}`)

  // ── Always attempt to fill address if checkoutProfile provided ───────────────
  // NOTE: Do NOT gate this on field detection — ESW Angular uses formControlName,
  // not standard 'name' attributes, so selector detection is unreliable.
  // humanType() handles missing fields gracefully (logs warn + returns false).
  if (checkoutProfile && checkoutProfile.firstName) {
    log('info', '\ud83d\udcdd checkoutProfile \u0e1e\u0e1a \u2014 \u0e40\u0e23\u0e35\u0e22\u0e01 fillCheckoutAddress...')
    await fillCheckoutAddress(page, checkoutProfile)
  } else {
    log('info', 'checkoutProfile \u0e27\u0e48\u0e32\u0e07 \u2014 \u0e02\u0e49\u0e32\u0e21\u0e01\u0e32\u0e23\u0e01\u0e23\u0e2d\u0e01 (\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e44\u0e27\u0e49\u0e43\u0e19 Nike account \u0e41\u0e25\u0e49\u0e27)')
  }

  // ── Wait for page to fully load ─────────────────────────────────────────────────────
  log('info', '\u0e23\u0e2d checkout \u0e42\u0e2b\u0e25\u0e14...')
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
  } catch {}

  // Wait for any spinner to finish
  try {
    await page.waitForSelector(
      '[aria-busy="true"], [class*="spinner"], [class*="loading"], svg[class*="spin"]',
      { state: 'hidden', timeout: 15000 }
    )
    log('info', 'Spinner \u0e2b\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27')
  } catch {
    log('warn', 'Spinner timeout \u2014 \u0e25\u0e2d\u0e07\u0e15\u0e48\u0e2d')
  }

  // Wait for Place Order button to APPEAR
  log('info', '\u0e23\u0e2d\u0e1b\u0e38\u0e48\u0e21 Place Order...')
  const placeOrderCombined = SEL.placeOrder.join(', ')
  const placeOrderVisible = await page.waitForSelector(placeOrderCombined, { timeout: 20000 })
    .then(() => true).catch(() => false)
  if (!placeOrderVisible) {
    log('warn', 'Place Order \u0e44\u0e21\u0e48\u0e1b\u0e23\u0e32\u0e01 \u2014 dump:')
    await dumpButtons(page)
  }

  await screenshot(page, `flow_checkout_loaded_${slug}`)
  log('info', `Checkout \u0e1e\u0e23\u0e49\u0e2d\u0e21 | URL: ${page.url()}`)
  log('info', `Page title: ${await page.title().catch(() => 'N/A')}`)

  // ── Step 4: Place Order ───────────────────────────────────────────────────
  const orderResult = await findAndClick(page, SEL.placeOrder, 8000)
  await screenshot(page, `flow_order_placed_${slug}`)
  if (!orderResult.clicked) {
    log('warn', 'ไม่พบปุ่ม Place Order — dump buttons:')
    await dumpButtons(page)
  }

  if (orderResult.clicked) {
    log('info', `✅ FLOW: สั่งซื้อแล้ว! "${orderResult.text}"`)
    // Wait to confirm order success
    await jitter(2000, 3000)
    try {
      await page.waitForURL(/\/(order-confirmation|checkout\/order)/, { timeout: 15000 })
      log('info', '🎉 Order Confirmed!')
      await screenshot(page, `flow_confirmed_${slug}`)
      return { success: true, step: 'order_confirmed' }
    } catch {
      await screenshot(page, `flow_after_order_${slug}`)
      return { success: true, step: 'order_placed_awaiting_confirm' }
    }
  } else {
    log('warn', 'ไม่พบปุ่ม Place Order')
    return { success: false, reason: 'no_place_order_btn' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAN / LEO — draw entry (select size + confirm; no checkout needed)
// Result: Nike processes later and notifies via app/email
// ─────────────────────────────────────────────────────────────────────────────
async function handleDrawEntry(page, item) {
  const { slug, title, sizes = [], launchMethod } = item
  log('info', `${launchMethod} Draw: เข้าร่วม ${title}`)

  // Size selection
  const sizeResult = await selectSize(page, sizes)
  if (!sizeResult.selected) {
    await screenshot(page, `draw_size_fail_${slug}`)
    return { success: false, reason: sizeResult.reason || 'size_unavailable', available: sizeResult.available }
  }

  await jitter(500, 1000)
  await screenshot(page, `draw_size_${slug}`)

  // Confirm draw entry
  const confirmResult = await findAndClick(page, SEL.confirm, 8000)
  await jitter(500, 1000)
  await screenshot(page, `draw_confirmed_${slug}`)

  if (!confirmResult.clicked) {
    return { success: false, reason: 'no_confirm_button' }
  }

  log('info', `✅ ${launchMethod}: เข้าร่วม Draw แล้ว! ไซส์ ${sizeResult.chosen}`)
  return { success: true, size: sizeResult.chosen, step: 'draw_entered' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigate to a URL with retry and explicit error logging
// ─────────────────────────────────────────────────────────────────────────────
async function navigateTo(page, url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log('info', `🌍 นำทาง (${attempt}/${retries}): ${url}`)
      // 'commit' = fastest — fires as soon as HTTP response headers arrive
      await page.goto(url, { waitUntil: 'commit', timeout: 20000 })
      // Then wait for the actual content
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 })
      const finalUrl = page.url()
      log('info', `✔ URL หลังนำทาง: ${finalUrl}`)
      if (finalUrl === 'about:blank' || finalUrl === '') {
        throw new Error('Page stayed at about:blank after navigation')
      }
      return true
    } catch (err) {
      log('error', `นำทาง attempt ${attempt} ล้มเหลว: ${err.message}`, { url })
      if (attempt < retries) await jitter(1000, 2000)
    }
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Main product page handler — dispatches to DAN/LEO or FLOW based on method
// ─────────────────────────────────────────────────────────────────────────────
async function handleProductPage(page, item) {
  const { slug, title, sizes = [], launchMethod = 'DAN' } = item

  // Validate slug
  if (!slug || slug.trim() === '') {
    log('error', `slug ว่างเปล่าสำหรับ: ${title} — ไม่สามารถนำทางได้`)
    return { success: false, reason: 'empty_slug' }
  }

  const url = `https://www.nike.com/th/launch/t/${slug}`
  log('info', `📄 เปิดหน้า: ${title}`, { url, launchMethod, slug })

  const navOk = await navigateTo(page, url)
  if (!navOk) {
    await screenshot(page, `nav_fail_${slug}`)
    log('error', `นำทางไปยัง ${url} ล้มเหลวทุก attempt`)
    return { success: false, reason: 'navigation_failed', url }
  }

  await screenshot(page, `page_${slug}`)
  log('info', `หน้าโหลดแล้ว — title: ${await page.title().catch(() => 'N/A')}`)

  // ── Check if sizes are already visible (no CTA needed) ──────────────────
  let sizeAlreadyVisible = false
  for (const sel of SEL.sizeBtn) {
    try {
      const count = await page.locator(sel).count()
      if (count > 0) { sizeAlreadyVisible = true; break }
    } catch {}
  }

  if (!sizeAlreadyVisible) {
    // Sizes not visible yet — need to click CTA first
    const ctaResult = await findAndClick(page, SEL.entryCta, 6000)
    if (!ctaResult.clicked) {
      log('warn', '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1b\u0e38\u0e48\u0e21 CTA \u2014 \u0e2d\u0e32\u0e08 Sold Out \u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48 LIVE')
      await dumpButtons(page)
      await screenshot(page, `no_cta_${slug}`)
      return { success: false, reason: 'no_cta_button' }
    }
    log('info', `\u2714 \u0e01\u0e14 CTA: "${ctaResult.text}" \u2014 \u0e23\u0e2d size sheet...`)
    await sleep(300)
  } else {
    log('info', '\u2714 Size grid \u0e42\u0e0a\u0e27\u0e4c\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27 \u2014 \u0e02\u0e49\u0e32\u0e21 CTA')
  }

  // ── Dispatch per launch method ────────────────────────────────────────────
  if (launchMethod === 'FLOW') {
    // 1. Select size
    const sizeResult = await selectSize(page, sizes)
    if (!sizeResult.selected) {
      await screenshot(page, `flow_size_fail_${slug}`)
      log('warn', `\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e0b\u0e2a\u0e4c: ${sizeResult.reason} | \u0e44\u0e0b\u0e2a\u0e4c\u0e17\u0e35\u0e48\u0e21\u0e35: [${(sizeResult.available || []).join(', ')}]`)
      return { success: false, reason: sizeResult.reason || 'size_unavailable', available: sizeResult.available }
    }
    await sleep(200)

    // 2. Click Confirm / Add to Bag
    await screenshot(page, `flow_pre_confirm_${slug}`)
    const confirmResult = await findAndClick(page, SEL.confirm, 5000)
    if (!confirmResult.clicked) {
      log('warn', '\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1b\u0e38\u0e48\u0e21 Add to Bag/Confirm')
      await dumpButtons(page)
      await screenshot(page, `flow_no_confirm_${slug}`)
      return { success: false, reason: 'no_confirm_button' }
    }
    log('info', `\u2714 \u0e01\u0e14 Add to Bag: "${confirmResult.text}"`)
    await sleep(300)

    // 3. Full checkout
    return await handleFlowCheckout(page, slug, item.checkoutProfile || null)
  } else {
    // DAN / LEO: draw entry only
    return await handleDrawEntry(page, { ...item, launchMethod })
  }
}

// ── Instant Buy (In-Stock products — no waiting needed) ───────────────────────
async function buyNow(item, profileDir = DEFAULT_PROFILE_DIR) {
  const { slug, title, sizes = [], checkoutProfile = null } = item
  log('info', `🛒 Instant Buy เริ่มต้น`, { title, slug: slug || '(empty)', sizes, profileDir })

  // Connect via CDP first; if not available, launch Chrome in debug mode
  let ctx = browserContext
  if (!ctx) {
    log('info', 'ยังไม่มี CDP connection — พยายามเชื่อมต่อ...')
    const cdpOk = await connectCDP()
    if (!cdpOk) {
      log('info', 'CDP ไม่พบ — เปิด Chrome debug mode...')
      try {
        await launchChromeDebug(profileDir)
        const ok = await connectCDP()
        if (!ok) {
          log('error', 'ไม่สามารถเชื่อมต่อ Chrome ได้ — กรุณากด "Launch Chrome" ในหน้า Bot ก่อน')
          return { success: false, reason: 'no_chrome', message: 'กรุณากด "Launch Chrome (Debug Mode)" ในหน้า Bot ก่อน' }
        }
      } catch (err) {
        log('error', `เปิด Chrome ไม่ได้: ${err.message}`)
        return { success: false, reason: 'browser_error', message: err.message }
      }
    }
    ctx = browserContext
  }

  let page
  try {
    page = await ctx.newPage()
    // In-stock products always use FLOW (direct add-to-bag → checkout)
    const result = await handleProductPage(page, { ...item, launchMethod: 'FLOW' })

    const task = {
      id: Date.now(),
      title,
      slug,
      type: 'instant_buy',
      result,
      time: new Date().toISOString(),
    }
    completedTasks.unshift(task)
    if (completedTasks.length > 50) completedTasks.pop()

    if (result.success) {
      log('info', `✅ Instant Buy สำเร็จ: ${title}`)
    } else {
      log('warn', `❌ Instant Buy ล้มเหลว: ${title} — ${result.reason}`)
    }
    return result
  } catch (err) {
    log('error', `Instant Buy exception: ${err.message}`)
    return { success: false, reason: 'exception', message: err.message }
  }
}

// ── Launch State Poller ────────────────────────────────────────────────────────
async function pollLaunchState(launchId) {
  try {
    const res = await fetch(`http://localhost:${process.env.PORT || 3001}/api/launch-state/${launchId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.launchState
  } catch {
    return null
  }
}

// ── Main Bot Loop ──────────────────────────────────────────────────────────────
async function startBot(profileDir = DEFAULT_PROFILE_DIR) {
  if (isRunning) {
    log('warn', 'Bot กำลังทำงานอยู่แล้ว')
    return
  }

  isRunning = true
  botStatus = 'running'
  log('info', '🤖 Bot เริ่มทำงาน', { watchlist: watchlist.map((w) => w.title) })

  try {
    await launchBrowser(profileDir)
  } catch (err) {
    log('error', `เปิด Chrome ไม่ได้: ${err.message}`)
    botStatus = 'error'
    isRunning = false
    return
  }

  const processedLaunches = new Set()

  const poll = async () => {
    if (!isRunning) return

    for (const item of watchlist) {
      if (!item.launchId || processedLaunches.has(item.launchId)) continue

      const state = await pollLaunchState(item.launchId)
      log('debug', `[${item.title}] launchState = ${state}`)

      if (state === 'ACCEPTING_ENTRIES') {
        log('info', `🚨 LIVE! ${item.title} — กำลังเข้าร่วม!`)
        processedLaunches.add(item.launchId)

        try {
          const page = await browserContext.newPage()
          const result = await handleProductPage(page, item)

          const task = {
            id: Date.now(),
            title: item.title,
            slug: item.slug,
            launchId: item.launchId,
            result,
            time: new Date().toISOString(),
          }

          if (result.success) {
            log('info', `✅ สำเร็จ: ${item.title} ไซส์ ${result.size}`)
          } else {
            log('warn', `❌ ล้มเหลว: ${item.title} — ${result.reason}`)
            // Retry: put back for re-check if size unavailable
            if (result.reason === 'no_button') {
              processedLaunches.delete(item.launchId)
            }
          }

          completedTasks.unshift(task)
          if (completedTasks.length > 50) completedTasks.pop()
        } catch (err) {
          log('error', `Error processing ${item.title}: ${err.message}`)
          processedLaunches.delete(item.launchId)
        }
      } else if (state === 'LAUNCH_CLOSED') {
        log('info', `[${item.title}] ปิดรับสมัครแล้ว`)
        processedLaunches.add(item.launchId)
      }
    }
  }

  pollTimer = setInterval(poll, 5000)
  poll()
  log('info', 'Bot กำลัง poll ทุก 5 วินาที...')
}

function stopBot() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  isRunning = false
  botStatus = 'idle'
  closeBrowser()
  log('info', '🛑 Bot หยุดทำงาน')
}

// ── Watchlist Management ───────────────────────────────────────────────────────
function addToWatchlist(item) {
  const exists = watchlist.find((w) => w.threadId === item.threadId)
  if (exists) {
    Object.assign(exists, item)
    log('info', `อัปเดต watchlist: ${item.title}`)
  } else {
    watchlist.push(item)
    log('info', `เพิ่มใน watchlist: ${item.title}`)
  }
  return watchlist
}

function removeFromWatchlist(threadId) {
  const item = watchlist.find((w) => w.threadId === threadId)
  watchlist = watchlist.filter((w) => w.threadId !== threadId)
  if (item) log('info', `ลบออกจาก watchlist: ${item.title}`)
  return watchlist
}

function getStatus() {
  return {
    status: botStatus,
    isRunning,
    cdpConnected: !!cdpBrowser,
    cdpUrl: CDP_URL,
    watchlistCount: watchlist.length,
    watchlist,
    completedTasks: completedTasks.slice(0, 20),
    chromeProfile: DEFAULT_PROFILE_DIR,
    chromePath: CHROME_PATH,
  }
}

module.exports = {
  startBot,
  stopBot,
  buyNow,
  launchChromeDebug,
  connectCDP,
  addToWatchlist,
  removeFromWatchlist,
  getStatus,
  addLogListener,
  getWatchlist: () => watchlist,
  getCompletedTasks: () => completedTasks,
}
