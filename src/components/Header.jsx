import NotificationPanel from './NotificationPanel'

export default function Header({ onRefresh, onFetchAll, countdown, lastUpdated, loading, loadingAll, fetchMode, totalFetched, view, onViewChange, notifSettings, saveNotifSettings, requestPermission, liveProducts, notifLog, clearLive, clearLog }) {
  const formatTime = (date) => {
    if (!date) return null
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const progress = (countdown / 60) * 100

  return (
    <header className="sticky top-0 z-50 bg-nike-black/95 backdrop-blur-sm border-b border-nike-border">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.456 0-2.397-.756-2.774-2.268l-.001-.007C-.001 13.926 0 13.926 0 13.926c0 .001 0-.001 0 0C0 12.64.96 11.48 2.879 10.68L24 2.2v5.6z" />
            </svg>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-none">
                SNKRS Tracker
              </h1>
              <p className="text-xs text-gray-400">Nike Thailand · Real-time</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center bg-nike-card border border-nike-border rounded-full p-1 gap-0.5">
            {[
              { key: 'instock', icon: '🛒', label: 'In Stock' },
              { key: 'upcoming', icon: '🚀', label: 'Upcoming' },
              { key: 'feed', icon: '📰', label: 'Feed' },
              { key: 'bot', icon: '🤖', label: 'Bot' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => onViewChange(tab.key)}
                className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full transition-all ${
                  view === tab.key
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Status & Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Live indicator */}
            <div className="hidden lg:flex items-center gap-2 bg-nike-card border border-nike-border rounded-full px-3 py-1.5">
              <span className="pulse-dot" />
              <span className="text-xs text-gray-300">
                {lastUpdated ? `${formatTime(lastUpdated)}` : 'กำลังโหลด...'}
              </span>
            </div>

            {/* Countdown ring — paused icon while loadingAll */}
            <div
              className="relative flex items-center justify-center"
              title={loadingAll ? 'หยุด auto-refresh ระหว่างโหลดทั้งหมด' : `auto-refresh ใน ${countdown}s`}
            >
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#333" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke={loadingAll ? '#f59e0b' : '#ffffff'}
                  strokeWidth="3"
                  strokeDasharray={loadingAll ? '100 0' : `${progress} 100`}
                  strokeLinecap="round"
                  style={{ transition: loadingAll ? 'none' : 'stroke-dasharray 1s linear' }}
                />
              </svg>
              <span className="absolute text-[9px] font-bold" style={{ color: loadingAll ? '#f59e0b' : 'white' }}>
                {loadingAll ? '⏸' : countdown}
              </span>
            </div>

            {/* Notification panel */}
            <NotificationPanel
              settings={notifSettings}
              saveSettings={saveNotifSettings}
              requestPermission={requestPermission}
              liveProducts={liveProducts}
              notifLog={notifLog}
              clearLive={clearLive}
              clearLog={clearLog}
            />

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-nike-card border border-nike-border hover:border-white text-white text-sm font-medium px-3 py-2 rounded-full transition-all disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Fetch All button */}
            <button
              onClick={onFetchAll}
              disabled={loading}
              className="flex items-center gap-2 bg-white text-black text-sm font-bold px-3 py-2 rounded-full hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">
                {fetchMode === 'all' ? `(${totalFetched})` : 'ทั้งหมด'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
