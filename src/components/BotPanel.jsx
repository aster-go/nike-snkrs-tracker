import { useState, useEffect, useRef } from 'react'

const DEFAULT_PROFILE = 'C:\\ChromeBotProfile'  // Dedicated bot profile (no spaces)
const DEFAULT_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const LOG_COLOR = {
  info:  'text-gray-300',
  debug: 'text-gray-600',
  warn:  'text-yellow-400',
  error: 'text-red-400',
}

const SIZE_PRESETS = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', 'S', 'M', 'L', 'XL']

export default function BotPanel({ watchlistQueue = [], onRemoveWatch }) {
  const [status, setStatus] = useState({ status: 'idle', isRunning: false, watchlist: [], cdpConnected: false })
  const [logs, setLogs] = useState([])
  const [profileDir, setProfileDir] = useState(DEFAULT_PROFILE)
  const [chromeExe, setChromeExe] = useState(DEFAULT_CHROME)
  const [activeTab, setActiveTab] = useState('watchlist')
  const [sizeConfigs, setSizeConfigs] = useState({}) // { threadId: ['10', '10.5'] }
  const [launchingChrome, setLaunchingChrome] = useState(false)
  const [connectingCDP, setConnectingCDP] = useState(false)
  const [cdpMsg, setCdpMsg] = useState('')
  const [checkoutProfile, setCheckoutProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nike_checkout_profile') || '{}') } catch { return {} }
  })
  const logsEndRef = useRef(null)
  const sseRef = useRef(null)

  // Poll status
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/bot/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch {}
    }
    poll()
    const t = setInterval(poll, 3000)
    return () => clearInterval(t)
  }, [])

  // SSE log stream
  useEffect(() => {
    const es = new EventSource('/api/bot/logs')
    sseRef.current = es
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data)
        setLogs((prev) => [entry, ...prev.slice(0, 299)])
      } catch {}
    }
    return () => es.close()
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, activeTab])

  // Sync external watchlist queue
  useEffect(() => {
    if (!watchlistQueue.length) return
    watchlistQueue.forEach((item) => {
      addToWatchlist(item)
    })
  }, [watchlistQueue]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToWatchlist = async (item) => {
    const sizes = sizeConfigs[item.threadId] || []
    await fetch('/api/bot/watchlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, sizes }),
    })
    refreshStatus()
  }

  const removeFromWatchlist = async (threadId) => {
    await fetch(`/api/bot/watchlist/${threadId}`, { method: 'DELETE' })
    onRemoveWatch?.(threadId)
    refreshStatus()
  }

  const refreshStatus = async () => {
    const res = await fetch('/api/bot/status')
    if (res.ok) setStatus(await res.json())
  }

  const handleLaunchChrome = async () => {
    setLaunchingChrome(true)
    setCdpMsg('')
    try {
      const res = await fetch('/api/bot/launch-chrome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileDir }),
      })
      const data = await res.json()
      setCdpMsg(data.message || data.error || '')
      // Auto-connect after Chrome opens
      setTimeout(async () => {
        await handleConnectCDP()
        setLaunchingChrome(false)
      }, 3500)
    } catch (err) {
      setCdpMsg(`Error: ${err.message}`)
      setLaunchingChrome(false)
    }
  }

  const handleConnectCDP = async () => {
    setConnectingCDP(true)
    setCdpMsg('')
    try {
      const res = await fetch('/api/bot/connect-cdp', { method: 'POST' })
      const data = await res.json()
      setCdpMsg(data.message || data.error || '')
      setTimeout(refreshStatus, 500)
    } catch (err) {
      setCdpMsg(`Error: ${err.message}`)
    }
    setConnectingCDP(false)
  }

  const handleStart = async () => {
    await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileDir }),
    })
    setTimeout(refreshStatus, 1000)
  }

  const handleStop = async () => {
    await fetch('/api/bot/stop', { method: 'POST' })
    setTimeout(refreshStatus, 1000)
  }

  const toggleSize = (threadId, size) => {
    setSizeConfigs((prev) => {
      const current = prev[threadId] || []
      const updated = current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size]
      return { ...prev, [threadId]: updated }
    })
  }

  const isRunning = status.isRunning
  const cdpConnected = status.cdpConnected || false
  const watchlist = status.watchlist || []

  return (
    <div className="min-h-screen bg-nike-black">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* CDP Connection Card — must connect Chrome before using bot */}
        <div className={`border rounded-2xl p-4 ${
          cdpConnected
            ? 'bg-green-900/20 border-green-700'
            : 'bg-orange-900/20 border-orange-700'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cdpConnected ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`} />
                <p className={`text-sm font-bold ${cdpConnected ? 'text-green-300' : 'text-orange-300'}`}>
                  {cdpConnected
                    ? '✔ Bot เชื่อมต่อ Chrome แล้ว — ซื้อได้เลย (เปิดเป็นแท็บใหม่ใน Chrome นี้)'
                    : '⚠️ ต้องทำครั้งเดียวก่อนใช้ Bot'}
                </p>
              </div>
              {cdpConnected ? (
                <p className="text-xs text-green-400/70">
                  Bot จะเปิด <strong>แท็บใหม่</strong> ใน Chrome หน้าต่างนี้เมื่อกด "ซื้อเลย" หรือ Watch — ไม่เปิด Chrome ใหม่แยก
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-orange-400/90 font-medium">วิธีตั้งค่า (ทำครั้งเดียว):</p>
                  <ol className="text-xs text-orange-400/80 space-y-0.5 list-decimal list-inside">
                    <li>กด <strong>"🚀 Restart Chrome"</strong> ด้านขวา</li>
                    <li>Chrome จะปิดแล้วเปิดใหม่พร้อมแอปนี้ (ใช้เวลา ~4 วิ)</li>
                    <li>Bot เชื่อมต่ออัตโนมัติ → แถบนี้จะเปลี่ยนเป็นสีเขียว</li>
                    <li>หลังจากนี้กด "ซื้อเลย" = เปิด <strong>แท็บใหม่</strong> ใน Chrome เดิม</li>
                  </ol>
                </div>
              )}
              {cdpMsg && (
                <p className={`text-xs mt-1 ${cdpMsg.includes('Error') || cdpMsg.includes('ไม่พบ') ? 'text-red-400' : 'text-green-400'}`}>
                  {cdpMsg}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!cdpConnected && (
                <button
                  onClick={handleLaunchChrome}
                  disabled={launchingChrome}
                  className="text-sm font-bold bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-full transition-colors flex items-center gap-2"
                >
                  {launchingChrome ? (
                    <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />รีสตาร์ท Chrome...</>
                  ) : (
                    <>🚀 Restart Chrome</>
                  )}
                </button>
              )}
              <button
                onClick={handleConnectCDP}
                disabled={connectingCDP}
                className={`text-sm font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-2 ${
                  cdpConnected
                    ? 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
                    : 'bg-blue-800 hover:bg-blue-700 text-white'
                }`}
              >
                {connectingCDP ? (
                  <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />เชื่อมต่อ...</>
                ) : (
                  <>🔌 {cdpConnected ? 'Re-connect' : 'Connect CDP'}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-nike-card border border-nike-border rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                <div>
                  <h2 className="text-xl font-black text-white">Nike SNKRS Bot</h2>
                  <p className="text-xs text-gray-500">Auto-entry ด้วย Chrome Profile ของคุณ</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${
                isRunning
                  ? 'bg-green-900/50 border-green-600 text-green-300'
                  : status.status === 'error'
                  ? 'bg-red-900/50 border-red-600 text-red-300'
                  : 'bg-gray-800 border-gray-600 text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : status.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`} />
                {isRunning ? 'กำลังทำงาน' : status.status === 'error' ? 'Error' : 'หยุดทำงาน'}
              </div>

              {isRunning ? (
                <button
                  onClick={handleStop}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-full transition-colors flex items-center gap-2"
                >
                  <span className="w-3 h-3 bg-white rounded-sm" />
                  หยุด Bot
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={watchlist.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-full transition-colors flex items-center gap-2"
                >
                  <span>▶</span>
                  เริ่ม Bot
                </button>
              )}
            </div>
          </div>

          {/* Warning */}
          {isRunning && (
            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-xl text-yellow-300 text-xs flex items-start gap-2">
              <span>⚠️</span>
              <span>Bot กำลังใช้ Chrome Profile ของคุณ — <strong>อย่าเปิด Chrome ซ้ำ</strong> ขณะ Bot ทำงานอยู่</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Watchlist', value: watchlist.length, icon: '👁', color: 'text-blue-400' },
            { label: 'สำเร็จ', value: (status.completedTasks || []).filter((t) => t.result?.success).length, icon: '✅', color: 'text-green-400' },
            { label: 'ล้มเหลว', value: (status.completedTasks || []).filter((t) => !t.result?.success).length, icon: '❌', color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="bg-nike-card border border-nike-border rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-nike-card border border-nike-border rounded-full p-1 w-fit">
          {[
            { key: 'watchlist', label: '👁 Watchlist' },
            { key: 'completed', label: '📋 ผลลัพธ์' },
            { key: 'logs', label: '📡 Log' },
            { key: 'settings', label: '⚙️ ตั้งค่า' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`text-sm font-bold px-4 py-1.5 rounded-full transition-all ${activeTab === tab.key ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Watchlist ─────────────────────────────────────────────────────── */}
        {activeTab === 'watchlist' && (
          <div className="space-y-3">
            {watchlist.length === 0 ? (
              <div className="bg-nike-card border border-nike-border rounded-2xl p-12 text-center text-gray-500">
                <p className="text-5xl mb-4">👁</p>
                <p className="text-lg font-bold">Watchlist ว่างอยู่</p>
                <p className="text-sm mt-2">คลิกปุ่ม <strong className="text-white">🤖 Watch</strong> บนการ์ดสินค้าที่ต้องการ</p>
              </div>
            ) : (
              watchlist.map((item) => (
                <WatchlistItem
                  key={item.threadId}
                  item={item}
                  sizeConfig={sizeConfigs[item.threadId] || item.sizes || []}
                  onSizeToggle={(size) => toggleSize(item.threadId, size)}
                  onRemove={() => removeFromWatchlist(item.threadId)}
                  onUpdateSizes={async () => {
                    const sizes = sizeConfigs[item.threadId] || []
                    await fetch('/api/bot/watchlist/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...item, sizes }),
                    })
                    refreshStatus()
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ── Completed Tasks ────────────────────────────────────────────────── */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {(status.completedTasks || []).length === 0 ? (
              <div className="bg-nike-card border border-nike-border rounded-2xl p-8 text-center text-gray-500">
                <p className="text-4xl mb-3">📋</p>
                <p>ยังไม่มีผลลัพธ์</p>
              </div>
            ) : (
              (status.completedTasks || []).map((task) => (
                <div key={task.id} className={`bg-nike-card border rounded-xl p-4 flex items-start justify-between gap-3 ${task.result?.success ? 'border-green-700/50' : 'border-red-800/50'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{task.result?.success ? '✅' : '❌'}</span>
                      <span className="font-bold text-white text-sm">{task.title}</span>
                    </div>
                    {task.result?.success && <p className="text-xs text-green-400">ไซส์ {task.result.size}</p>}
                    {!task.result?.success && <p className="text-xs text-red-400">{task.result?.reason}</p>}
                    <p className="text-xs text-gray-600 mt-1">{new Date(task.time).toLocaleString('th-TH')}</p>
                  </div>
                  <a href={`https://www.nike.com/th/launch/t/${task.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded-full whitespace-nowrap">
                    เปิดหน้า →
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Logs ──────────────────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📡 Real-time Bot Log</p>
              <button onClick={() => setLogs([])} className="text-xs text-gray-600 hover:text-white">ล้าง</button>
            </div>
            <div className="h-96 overflow-y-auto p-4 font-mono text-xs space-y-1" style={{ direction: 'ltr' }}>
              {logs.length === 0 && <p className="text-gray-600">รอ log...</p>}
              {[...logs].reverse().map((entry, i) => (
                <div key={i} className={`flex gap-3 ${LOG_COLOR[entry.level] || 'text-gray-400'}`}>
                  <span className="text-gray-700 shrink-0">{new Date(entry.time).toLocaleTimeString('th-TH')}</span>
                  <span className="text-gray-600 w-10 shrink-0">[{entry.level}]</span>
                  <span className="break-all">{entry.msg}</span>
                  {entry.data && <span className="text-gray-700 truncate">{JSON.stringify(entry.data)}</span>}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* ── Settings ──────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-nike-card border border-nike-border rounded-2xl p-5 space-y-6">
            <h3 className="font-bold text-white">⚙️ ตั้งค่า Bot</h3>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Chrome Profile Directory</label>
              <input
                value={profileDir}
                onChange={(e) => setProfileDir(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
              />
              <p className="text-xs text-gray-600">โฟลเดอร์ที่มี Login Nike อยู่แล้ว</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Chrome Executable Path</label>
              <input
                value={chromeExe}
                onChange={(e) => setChromeExe(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            {/* Checkout Profile — auto-fill on gs-checkout.nike.com */}
            <div className="border border-blue-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-300">📝 Checkout Profile (Auto-fill)</p>
                  <p className="text-xs text-blue-400/70 mt-0.5">Bot กรอกให้อัตโนมัติบน gs-checkout.nike.com ถ้าไม่มีที่อยู่บันทึกไว้</p>
                </div>
                {checkoutProfile.firstName && (
                  <span className="text-xs bg-green-900/50 border border-green-700 text-green-300 px-2 py-1 rounded-full">✔ บันทึกแล้ว</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['firstName', 'ชื่อ *'], ['lastName', 'นามสกุล *'], ['phone', 'เบอร์โทร *'], ['postalCode', 'รหัสไปรษณีย์ *']].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs text-gray-400">{label}</label>
                    <input
                      value={checkoutProfile[key] || ''}
                      onChange={(e) => {
                        const updated = { ...checkoutProfile, [key]: e.target.value }
                        setCheckoutProfile(updated)
                        localStorage.setItem('nike_checkout_profile', JSON.stringify(updated))
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">ที่อยู่ เลขที่/หมู่บ้าน/สอย *</label>
                <input
                  value={checkoutProfile.address1 || ''}
                  onChange={(e) => {
                    const updated = { ...checkoutProfile, address1: e.target.value }
                    setCheckoutProfile(updated)
                    localStorage.setItem('nike_checkout_profile', JSON.stringify(updated))
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">ที่อยู่ ชื่ออาคาร/แขวง/เขต (ถ้ามี)</label>
                <input
                  value={checkoutProfile.address2 || ''}
                  onChange={(e) => {
                    const updated = { ...checkoutProfile, address2: e.target.value }
                    setCheckoutProfile(updated)
                    localStorage.setItem('nike_checkout_profile', JSON.stringify(updated))
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-600">ข้อมูลบันทึกใน localStorage — ไม่ถูกส่งออกนอกเครื่อง</p>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl text-xs text-blue-300 space-y-2">
              <p className="font-bold">📋 วิธีใช้:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-400">
                <li>ปิด Chrome ทุกหน้าต่างก่อนกด "เริ่ม Bot"</li>
                <li>เพิ่มสินค้าใน Watchlist จากหน้า Upcoming</li>
                <li>เลือกไซส์ที่ต้องการในแต่ละสินค้า</li>
                <li>กด "เริ่ม Bot" — Bot จะ poll ทุก 5 วินาที</li>
                <li>เมื่อสินค้า LIVE → Chrome จะเปิดอัตโนมัติและสมัคร/ซื้อ</li>
              </ol>
            </div>

            <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-xs text-red-300">
              <p className="font-bold mb-1">⚠️ ข้อควรระวัง:</p>
              <ul className="list-disc list-inside space-y-1 text-red-400">
                <li>ห้ามเปิด Chrome ขณะ Bot กำลังทำงาน</li>
                <li>Bot ใช้ session ที่ login Nike ไว้แล้ว</li>
                <li>Nike อาจ ban account หากใช้ bot</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WatchlistItem({ item, sizeConfig, onSizeToggle, onRemove, onUpdateSizes }) {
  const [expanded, setExpanded] = useState(true)
  const nikeUrl = `https://www.nike.com/th/launch/t/${item.slug}`
  const launch = item.launches?.[0] || {}

  return (
    <div className="bg-nike-card border border-nike-border rounded-2xl overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-800" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white text-sm">{item.title}</p>
              <p className="text-xs text-gray-500">{item.styleColor}</p>
              {item.launchId && (
                <p className="text-xs text-gray-600 font-mono mt-0.5">ID: {item.launchId}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={nikeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white">↗</a>
              <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white text-sm">{expanded ? '▲' : '▼'}</button>
              <button onClick={onRemove} className="text-red-600 hover:text-red-400 text-sm font-bold">✕</button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {item.launchMethod && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                item.launchMethod === 'DAN' ? 'bg-purple-900/80 border-purple-600 text-purple-300' :
                item.launchMethod === 'LEO' ? 'bg-blue-900/80 border-blue-600 text-blue-300' :
                'bg-green-900/80 border-green-600 text-green-300'
              }`}>{item.launchMethod}</span>
            )}
            {item.price && <span className="text-xs text-white font-bold">฿{item.price?.toLocaleString()}</span>}
            {sizeConfig.length > 0 && (
              <span className="text-xs text-green-400">Sizes: {sizeConfig.join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800/50 pt-3">
          <p className="text-xs text-gray-500 mb-2">เลือกไซส์ (ลำดับแรกที่มี = จะถูกเลือก)</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SIZE_PRESETS.map((size) => (
              <button key={size} onClick={() => onSizeToggle(size)}
                className={`w-10 h-8 rounded-lg text-xs font-bold border transition-colors ${
                  sizeConfig.includes(size)
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-400'
                }`}>
                {size}
              </button>
            ))}
          </div>
          <button onClick={onUpdateSizes}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-1.5 rounded-full transition-colors">
            💾 บันทึกไซส์
          </button>
        </div>
      )}
    </div>
  )
}
