import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import ProductCard from './components/ProductCard'
import FeedCard from './components/FeedCard'
import FilterBar from './components/FilterBar'
import StatsBar from './components/StatsBar'
import SkeletonCard from './components/SkeletonCard'
import ThreadModal from './components/ThreadModal'
import ExportButton from './components/ExportButton'
import BotPanel from './components/BotPanel'
import { useNotifications } from './hooks/useNotifications'

const AUTO_REFRESH_INTERVAL = 60 // seconds

export default function App() {
  const [view, setView] = useState('instock') // instock | upcoming | feed | bot
  const [modalItem, setModalItem] = useState(null)
  const [watchedIds, setWatchedIds] = useState(new Set())
  const [instockProducts, setInstockProducts] = useState([])
  const [upcomingProducts, setUpcomingProducts] = useState([])
  const [feedProducts, setFeedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalFetched, setTotalFetched] = useState(0)
  const [fetchMode, setFetchMode] = useState('page')
  const countdownRef = useRef(null)
  const loadingAllRef = useRef(false)  // track loadingAll without closure stale-value issue
  const fetchModeRef = useRef('page')  // same for fetchMode

  const products = view === 'instock' ? instockProducts : view === 'upcoming' ? upcomingProducts : feedProducts

  const fetchProducts = useCallback(async (fetchAll = false, targetView = null) => {
    const currentView = targetView || view
    try {
      if (fetchAll) setLoadingAll(true)
      else setLoading(true)
      setError(null)

      let url
      if (fetchAll) {
        if (currentView === 'upcoming') url = '/api/all-upcoming'
        else if (currentView === 'feed') url = '/api/all-feed'
        else url = '/api/all-products'
      } else {
        if (currentView === 'upcoming') url = '/api/upcoming'
        else if (currentView === 'feed') url = '/api/feed'
        else url = '/api/in-stock'
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.error) throw new Error(data.message || data.error)

      const items = data.items || []
      if (currentView === 'upcoming') setUpcomingProducts(items)
      else if (currentView === 'feed') setFeedProducts(items)
      else setInstockProducts(items)

      setLastUpdated(new Date())
      setHasMore(!!data.has_more)
      setTotalFetched(data.total || items.length)
      const newMode = fetchAll ? 'all' : 'page'
      setFetchMode(newMode)
      fetchModeRef.current = newMode
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingAll(false)
      loadingAllRef.current = false
    }
  }, [view])

  // Fetch when view changes
  useEffect(() => {
    setFilter('all')
    setSortBy(view === 'upcoming' ? 'launch_asc' : 'newest')
    setSearch('')
    setFetchMode('page')

    const cached = view === 'instock' ? instockProducts : view === 'upcoming' ? upcomingProducts : feedProducts
    if (cached.length === 0) {
      fetchProducts(false, view)
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch (all 3 views in parallel) + sync bot watchlist
  useEffect(() => {
    fetchProducts(false, 'instock')
    fetchProducts(false, 'upcoming')
    fetchProducts(false, 'feed')
    // Sync watchedIds from server (persists across browser refresh)
    fetch('/api/bot/watchlist')
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setWatchedIds(new Set(list.map((w) => w.threadId)))
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh countdown — pauses when loadAll is running
  const startCountdown = useCallback(() => {
    clearInterval(countdownRef.current)
    setCountdown(AUTO_REFRESH_INTERVAL)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        // Skip if loadAll is active — avoid overwriting full data with page-1
        if (loadingAllRef.current) return prev
        if (prev <= 1) {
          // If we loaded all pages before, reload all on refresh
          if (fetchModeRef.current === 'all') {
            loadingAllRef.current = true
            fetchProducts(true)
          } else {
            fetchProducts(false)
          }
          return AUTO_REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)
  }, [fetchProducts])

  useEffect(() => {
    startCountdown()
    return () => clearInterval(countdownRef.current)
  }, [startCountdown])

  const handleManualRefresh = () => {
    if (loadingAllRef.current) return  // Don't interrupt loadAll
    startCountdown()
    fetchProducts(fetchModeRef.current === 'all' ? true : false)
  }

  const handleFetchAll = () => {
    loadingAllRef.current = true
    fetchProducts(true)
  }

  const handleViewChange = (newView) => {
    setView(newView)
  }

  const handleWatch = async (item, product, sizes = []) => {
    const threadId = item.thread_id
    const launch = product.launches?.[0]
    const payload = {
      threadId,
      slug: item.seo_slug || '',
      title: item.title || product.title,
      styleColor: product.style_color || '',
      launchId: launch?.launch_id || null,
      launchMethod: launch?.launch_method || null,
      price: product.msrp,
      imageUrl: item.cover_card?.portrait_image?.url || null,
      launches: product.launches || [],
      sizes,
    }
    try {
      await fetch('/api/bot/watchlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setWatchedIds((prev) => new Set([...prev, threadId]))
      setView('bot')
    } catch {}
  }

  const handleUnwatch = (threadId) => {
    setWatchedIds((prev) => { const s = new Set(prev); s.delete(threadId); return s })
  }

  const handleBuyNow = async (item, product, sizes = []) => {
    const slug = item.seo_slug || item.thread_id || ''
    const checkoutProfile = (() => {
      try { return JSON.parse(localStorage.getItem('nike_checkout_profile') || '{}') } catch { return {} }
    })()
    const payload = {
      slug,
      threadId: item.thread_id,
      title: item.title || product.title,
      styleColor: product.style_color || '',
      price: product.msrp,
      imageUrl: item.cover_card?.portrait_image?.url || null,
      sizes,
      launchMethod: 'FLOW',
      checkoutProfile: checkoutProfile.firstName ? checkoutProfile : null,
    }
    await fetch('/api/bot/buy-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  const { settings: notifSettings, saveSettings: saveNotifSettings, requestPermission, liveProducts, notifLog, clearLive, clearLog } = useNotifications(upcomingProducts)

  // Filter and sort
  const filteredProducts = products
    .filter((item) => {
      // Feed view: filter by card type
      if (view === 'feed') {
        if (filter === 'product' && item.type !== 'product-card') return false
        if (filter === 'story' && item.type !== 'story-card') return false
        if (filter === 'content' && item.type !== 'content-card') return false
      }
      // Product-specific filters
      const product = item.products?.[0]
      if (filter === 'available' && (!product || !product.available)) return false
      if (filter === 'footwear' && product?.product_type !== 'FOOTWEAR') return false
      if (filter === 'apparel' && product?.product_type !== 'APPAREL') return false
      if (filter === 'multi' && !item.is_multi_product) return false
      if (filter === 'invite' && !product?.launches?.[0]?.invitation_only) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const t = (item.title || '').toLowerCase()
        const sc = (product?.style_color || '').toLowerCase()
        const ct = (item.cover_card?.title || '').toLowerCase()
        if (!t.includes(q) && !sc.includes(q) && !ct.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const pa = a.products?.[0]
      const pb = b.products?.[0]
      if (sortBy === 'price_asc') return (pa?.msrp || 0) - (pb?.msrp || 0)
      if (sortBy === 'price_desc') return (pb?.msrp || 0) - (pa?.msrp || 0)
      if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '', 'th')
      if (sortBy === 'launch_asc') return new Date(a.effective_start_sell_date) - new Date(b.effective_start_sell_date)
      return new Date(b.effective_start_sell_date) - new Date(a.effective_start_sell_date)
    })

  const now = new Date()
  const stats = view === 'instock'
    ? {
        total: products.length,
        available: products.filter((i) => i.products?.[0]?.available).length,
        footwear: products.filter((i) => i.products?.[0]?.product_type === 'FOOTWEAR').length,
        apparel: products.filter((i) => i.products?.[0]?.product_type === 'APPAREL').length,
      }
    : view === 'upcoming'
    ? {
        total: products.length,
        today: products.filter((i) => {
          const d = new Date(i.effective_start_sell_date)
          return d > now && (d - now) < 24 * 60 * 60 * 1000
        }).length,
        thisWeek: products.filter((i) => {
          const d = new Date(i.effective_start_sell_date)
          return d > now && (d - now) < 7 * 24 * 60 * 60 * 1000
        }).length,
        leo: products.filter((i) => i.products?.[0]?.launches?.[0]?.launch_method === 'LEO').length,
      }
    : {
        total: products.length,
        productCards: products.filter((i) => i.type === 'product-card').length,
        storyCards: products.filter((i) => i.type === 'story-card').length,
        contentCards: products.filter((i) => i.type === 'content-card').length,
      }

  // Don't render the main grid when on bot tab
  const isBotView = view === 'bot'

  return (
    <div className="min-h-screen bg-nike-black">
      {modalItem && (
        <ThreadModal item={modalItem} onClose={() => setModalItem(null)} />
      )}

      <Header
        onRefresh={handleManualRefresh}
        onFetchAll={handleFetchAll}
        countdown={countdown}
        lastUpdated={lastUpdated}
        loading={loading || loadingAll}
        loadingAll={loadingAll}
        fetchMode={fetchMode}
        totalFetched={totalFetched}
        view={view}
        onViewChange={handleViewChange}
        notifSettings={notifSettings}
        saveNotifSettings={saveNotifSettings}
        requestPermission={requestPermission}
        liveProducts={liveProducts}
        notifLog={notifLog}
        clearLive={clearLive}
        clearLog={clearLog}
      />

      {isBotView ? (
        <BotPanel
          onRemoveWatch={handleUnwatch}
        />
      ) : null}

      <div className={`max-w-screen-2xl mx-auto px-4 py-4 ${isBotView ? 'hidden' : ''}`}>
        <StatsBar stats={stats} filter={filter} view={view} />

        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <FilterBar
              filter={filter}
              setFilter={setFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
              resultCount={filteredProducts.length}
              view={view}
            />
          </div>
          <ExportButton products={products} view={view} />
        </div>

        {error && (
          <div className="my-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold">ไม่สามารถดึงข้อมูลได้</p>
              <p className="text-sm mt-1 text-red-400">{error}</p>
              <button onClick={handleManualRefresh} className="mt-2 text-sm bg-red-700 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors">
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {(loading || loadingAll) && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {loadingAll && (
              <div className="my-4 flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังดึงข้อมูลทั้งหมด...
              </div>
            )}

            {filteredProducts.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <span className="text-6xl mb-4">{view === 'upcoming' ? '🚀' : view === 'feed' ? '📰' : '👟'}</span>
                <p className="text-xl font-bold">ไม่พบรายการ</p>
                <p className="text-sm mt-2">ลองเปลี่ยน filter หรือค้นหาใหม่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {filteredProducts.map((item) => (
                  view === 'feed'
                    ? <FeedCard key={item.thread_id} item={item} onClick={item.type === 'product-card' ? () => setModalItem(item) : undefined} />
                    : <ProductCard
                        key={item.thread_id}
                        item={item}
                        isUpcoming={view === 'upcoming'}
                        onClick={() => setModalItem(item)}
                        onWatch={view === 'upcoming' ? handleWatch : undefined}
                        isWatched={watchedIds.has(item.thread_id)}
                        onBuyNow={view === 'instock' ? handleBuyNow : undefined}
                      />
                ))}
              </div>
            )}

            {fetchMode === 'page' && !loading && view !== 'upcoming' && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-gray-500 text-sm">
                  แสดง {filteredProducts.length} / {products.length} รายการ (หน้าแรก)
                </p>
                <button
                  onClick={handleFetchAll}
                  disabled={loadingAll}
                  className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingAll ? (
                    <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />กำลังโหลดทั้งหมด...</>
                  ) : ('โหลดสินค้าทั้งหมด')}
                </button>
              </div>
            )}

            {fetchMode === 'all' && (
              <div className="mt-6 text-center text-gray-500 text-sm">
                โหลดทั้งหมด {totalFetched} รายการแล้ว{hasMore && ' (ยังมีหน้าถัดไป)'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
