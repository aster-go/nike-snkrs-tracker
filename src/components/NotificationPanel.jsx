import { useState } from 'react'

export default function NotificationPanel({ settings, saveSettings, requestPermission, liveProducts, notifLog, clearLive, clearLog }) {
  const [open, setOpen] = useState(false)
  const [permStatus, setPermStatus] = useState(Notification.permission)

  const handleToggle = async () => {
    if (!settings.enabled) {
      const perm = await requestPermission()
      setPermStatus(perm)
    }
    saveSettings({ enabled: !settings.enabled })
  }

  const handlePerm = async () => {
    const perm = await requestPermission()
    setPermStatus(perm)
  }

  const liveCount = liveProducts.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-full border transition-all ${
          settings.enabled
            ? 'bg-green-900/50 border-green-600 text-green-300'
            : 'bg-nike-card border-nike-border text-gray-400 hover:border-gray-400'
        }`}
        title="การแจ้งเตือน"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span className="hidden sm:inline">{settings.enabled ? 'แจ้งเตือน ON' : 'แจ้งเตือน'}</span>
        {liveCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
            {liveCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-white text-sm">🔔 การแจ้งเตือน</h3>
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
              </div>

              {/* Main toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl mb-2">
                <div>
                  <p className="text-sm font-bold text-white">เปิดการแจ้งเตือน</p>
                  <p className="text-xs text-gray-500">แจ้งเมื่อสินค้า LIVE</p>
                </div>
                <button
                  onClick={handleToggle}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Sound toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl mb-2">
                <div>
                  <p className="text-sm font-medium text-white">🔊 เสียงแจ้งเตือน</p>
                </div>
                <button
                  onClick={() => saveSettings({ sound: !settings.sound })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.sound ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.sound ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Browser notification */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl mb-3">
                <div>
                  <p className="text-sm font-medium text-white">🖥 Browser Notification</p>
                  <p className={`text-xs ${permStatus === 'granted' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {permStatus === 'granted' ? 'อนุญาตแล้ว' : permStatus === 'denied' ? 'ถูกบล็อก' : 'ยังไม่อนุญาต'}
                  </p>
                </div>
                {permStatus !== 'granted' && permStatus !== 'denied' && (
                  <button onClick={handlePerm} className="text-xs bg-white text-black font-bold px-3 py-1 rounded-full">
                    อนุญาต
                  </button>
                )}
                {permStatus === 'granted' && (
                  <button
                    onClick={() => saveSettings({ browserNotif: !settings.browserNotif })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.browserNotif ? 'bg-blue-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.browserNotif ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                )}
              </div>

              {/* Poll interval */}
              <div className="p-3 bg-gray-800/50 rounded-xl">
                <p className="text-sm font-medium text-white mb-2">⚡ ตรวจสอบทุก (ก่อน Launch 60 นาที)</p>
                <div className="flex gap-2">
                  {[5, 10, 20, 30].map((s) => (
                    <button
                      key={s}
                      onClick={() => saveSettings({ pollInterval: s })}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                        settings.pollInterval === s ? 'bg-white text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live products */}
            {liveProducts.length > 0 && (
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider">🟢 LIVE ตอนนี้!</h4>
                  <button onClick={clearLive} className="text-xs text-gray-500 hover:text-white">ล้าง</button>
                </div>
                <div className="space-y-2">
                  {liveProducts.map((p) => (
                    <div key={p.launchId} className="bg-green-900/30 border border-green-700 rounded-xl p-2">
                      <p className="text-xs font-bold text-green-300 truncate">{p.title}</p>
                      <p className="text-xs text-gray-500">{p.time.toLocaleTimeString('th-TH')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notification log */}
            {notifLog.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ประวัติ</h4>
                  <button onClick={clearLog} className="text-xs text-gray-500 hover:text-white">ล้าง</button>
                </div>
                <div className="space-y-1.5">
                  {notifLog.slice(0, 10).map((n, i) => (
                    <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 shrink-0">{n.time.toLocaleTimeString('th-TH')}</span>
                      <span className="truncate">{n.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!settings.enabled && (
              <div className="p-4 text-center text-gray-500 text-xs">
                เปิดการแจ้งเตือนเพื่อรับ alert เมื่อสินค้าเปิดลงทะเบียน
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
