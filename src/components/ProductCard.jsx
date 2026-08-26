import { useState, useEffect } from 'react'
import LaunchCountdown from './LaunchCountdown'
import SizePicker, { loadPrefs } from './SizePicker'
import ImageLightbox from './ImageLightbox'

const LAUNCH_STATE_CONFIG = {
  ACCEPTING_ENTRIES: {
    label: '🟢 LIVE! รับสมัครอยู่',
    cls: 'bg-green-900/80 border-green-500 text-green-300 animate-pulse',
  },
  NOT_ACCEPTING_ENTRIES: {
    label: '⏳ ยังไม่เปิด',
    cls: 'bg-gray-800/80 border-gray-600 text-gray-400',
  },
  LAUNCH_CLOSED: {
    label: '🔴 ปิดรับสมัครแล้ว',
    cls: 'bg-red-900/50 border-red-700 text-red-400',
  },
}

const LEVEL_CONFIG = {
  HIGH:   { label: 'สต็อกสูง',   cls: 'border-green-500 text-green-400 bg-green-500/10' },
  MEDIUM: { label: 'สต็อกกลาง',  cls: 'border-blue-500 text-blue-400 bg-blue-500/10' },
  LOW:    { label: 'สต็อกน้อย',  cls: 'border-yellow-500 text-yellow-400 bg-yellow-500/10' },
  OOS:    { label: 'หมดสต็อก',   cls: 'border-red-700 text-red-500 bg-red-500/10' },
}

function getSizeClass(sku) {
  if (!sku.available) return 'border-gray-700 text-gray-600 line-through'
  const level = sku.level
  if (level === 'HIGH') return 'border-green-600 text-green-400 bg-green-500/10'
  if (level === 'MEDIUM') return 'border-blue-600 text-blue-400 bg-blue-500/10'
  if (level === 'LOW') return 'border-yellow-600 text-yellow-400 bg-yellow-500/10'
  if (level === 'OOS') return 'border-red-800 text-red-600 line-through'
  return 'border-green-600 text-green-400 bg-green-500/10'
}

function getOverallStock(skus) {
  const available = skus.filter((s) => s.available)
  if (available.length === 0) return null
  const levels = available.map((s) => s.level).filter(Boolean)
  if (levels.includes('HIGH')) return 'HIGH'
  if (levels.includes('MEDIUM')) return 'MEDIUM'
  if (levels.length > 0) return 'LOW'
  return null
}

function formatPrice(price, currency) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: currency || 'THB',
    minimumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

const LAUNCH_METHOD_LABEL = {
  LEO: { label: 'LEO', title: 'Launch Entry Order', color: 'bg-blue-900/80 text-blue-300 border-blue-600' },
  DAN: { label: 'DAN', title: 'Draw and Notify', color: 'bg-purple-900/80 text-purple-300 border-purple-600' },
  FLOW: { label: 'FLOW', title: 'First Come First Serve', color: 'bg-green-900/80 text-green-300 border-green-600' },
}

export default function ProductCard({ item, isUpcoming = false, onClick, onWatch, isWatched = false, onBuyNow }) {
  const [imgError, setImgError] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [showAllSizes, setShowAllSizes] = useState(false)
  const [launchState, setLaunchState] = useState(null)
  const [checkingState, setCheckingState] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyResult, setBuyResult] = useState(null) // null | 'sent' | 'error'
  const [showSizePicker, setShowSizePicker] = useState(false) // 'buy' | 'watch' | null

  // Load saved size preferences for this product
  const prefKey = item?.seo_slug || item?.thread_id
  const savedSizes = prefKey ? (loadPrefs()[prefKey] || []) : []

  const handleBuyConfirm = async (sizes) => {
    setShowSizePicker(null)
    if (!onBuyNow) return
    setBuying(true)
    setBuyResult(null)
    try {
      await onBuyNow(item, product, sizes)
      setBuyResult('sent')
    } catch {
      setBuyResult('error')
    }
    setBuying(false)
    setTimeout(() => setBuyResult(null), 6000)
  }

  const handleWatchConfirm = (sizes) => {
    setShowSizePicker(null)
    onWatch?.(item, product, sizes)
  }

  const product = item.products?.[0]
  if (!product) return null

  const coverCard = item.cover_card
  const imageUrl = imgError
    ? null
    : (coverCard?.portrait_image?.url || coverCard?.square_image?.url || product.assets?.[0]?.url)

  const title = item.title || product.title
  const colorway = coverCard?.title || ''
  const styleColor = product.style_color
  const price = product.msrp
  const currency = product.currency
  const available = product.available
  const productType = product.product_type
  const skus = product.skus || []
  const launchDate = item.effective_start_sell_date
  const isMulti = item.is_multi_product
  const genders = product.genders || []
  const madeIn = product.manufacturing_countries_of_origin?.[0]

  // Launch info (upcoming)
  const launch = product.launches?.[0]
  const launchMethod = launch?.launch_method
  const launchMethodCfg = launchMethod ? LAUNCH_METHOD_LABEL[launchMethod] : null
  const startEntryDate = launch?.start_entry_date
  const stopEntryDate = launch?.stop_entry_date
  const invitationOnly = launch?.invitation_only
  const launchId = launch?.launch_id

  // Auto-fetch launch state for upcoming products with a launch_id
  useEffect(() => {
    if (!isUpcoming || !launchId) return
    let cancelled = false
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/launch-state/${launchId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.launchState) setLaunchState(data.launchState)
      } catch {}
    }
    fetchState()
    const interval = setInterval(fetchState, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [isUpcoming, launchId])

  const handleCheckState = async () => {
    if (!launchId || checkingState) return
    setCheckingState(true)
    try {
      const res = await fetch(`/api/launch-state/${launchId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.launchState) setLaunchState(data.launchState)
      }
    } catch {}
    setCheckingState(false)
  }

  const launchStateCfg = launchState ? LAUNCH_STATE_CONFIG[launchState] : null

  const overallStock = getOverallStock(skus)
  const stockConfig = overallStock ? LEVEL_CONFIG[overallStock] : null

  const availableSkus = skus.filter((s) => s.available)
  const displaySkus = showAllSizes ? skus : skus.slice(0, 12)

  const nikeUrl = `https://www.nike.com/th/launch/t/${item.seo_slug || ''}`

  const isLive = launchState === 'ACCEPTING_ENTRIES'
  const launchingSoon = startEntryDate && (new Date(startEntryDate) - new Date()) < 24 * 60 * 60 * 1000 && new Date(startEntryDate) > new Date()

  return (
    <div
      className={`product-card bg-nike-card border rounded-2xl overflow-hidden card-hover group ${
        isLive ? 'border-green-500' : launchingSoon ? 'border-orange-600/70' : 'border-nike-border'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      {lightboxOpen && imageUrl && (
        <ImageLightbox
          images={[imageUrl]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      <div className="relative aspect-square bg-gray-900 overflow-hidden group/img">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={title}
              className="product-image w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
              className="absolute bottom-2 right-2 z-10 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              title="ขยายรูป"
            >
              🔍 ขยาย
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isUpcoming && isLive && (
            <span className="badge bg-green-900/90 text-green-300 border border-green-500 animate-pulse">
              🟢 LIVE!
            </span>
          )}
          {isUpcoming && !isLive && launchingSoon && (
            <span className="badge bg-orange-900/90 text-orange-300 border border-orange-600 animate-pulse">
              🔥 เร็วๆนี้
            </span>
          )}
          {!isUpcoming && !available && (
            <span className="badge bg-gray-800/90 text-gray-300 border border-gray-600">หมด</span>
          )}
          {!isUpcoming && available && stockConfig && (
            <span className={`badge border ${stockConfig.cls}`}>{stockConfig.label}</span>
          )}
          {isMulti && (
            <span className="badge bg-purple-900/80 text-purple-300 border border-purple-600">Set</span>
          )}
          {invitationOnly && (
            <span className="badge bg-yellow-900/80 text-yellow-300 border border-yellow-600">✉️ Invite</span>
          )}
        </div>

        {/* Right badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className="badge bg-black/70 text-gray-300 border border-gray-700">
            {productType === 'FOOTWEAR' ? '👟' : '👕'} {productType === 'FOOTWEAR' ? 'Footwear' : 'Apparel'}
          </span>
          {launchMethodCfg && (
            <span className={`badge border ${launchMethodCfg.color}`} title={launchMethodCfg.title}>
              {launchMethodCfg.label}
            </span>
          )}
        </div>

        {/* Open Nike link */}
        <a
          href={nikeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-4 transition-opacity bg-gradient-to-t from-black/60 to-transparent"
        >
          <span className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-colors">
            ดูใน Nike →
          </span>
        </a>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Title + Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight truncate" title={title}>
              {title}
            </h3>
            {colorway && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{colorway}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-black text-white whitespace-nowrap">
              {formatPrice(price, currency)}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {styleColor && (
            <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
              {styleColor}
            </span>
          )}
          {genders.map((g) => (
            <span key={g} className="text-xs text-gray-500">
              {g === 'MEN' ? '♂' : g === 'WOMEN' ? '♀' : '🧒'} {g}
            </span>
          ))}
          {madeIn && (
            <span className="text-xs text-gray-600 ml-auto">🏭 {madeIn}</span>
          )}
        </div>

        {/* Launch state badge (upcoming) */}
        {isUpcoming && launchStateCfg && (
          <div className={`text-xs font-bold px-2 py-1.5 rounded-lg border ${launchStateCfg.cls}`}>
            {launchStateCfg.label}
          </div>
        )}

        {/* Check state button if no state yet */}
        {isUpcoming && launchId && !launchState && (
          <button
            onClick={handleCheckState}
            disabled={checkingState}
            className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2 py-1 transition-colors flex items-center gap-1.5"
          >
            {checkingState ? (
              <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />ตรวจสอบ...</>
            ) : (
              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>เช็ค Launch State</>
            )}
          </button>
        )}

        {/* Launch countdown (upcoming only) */}
        {isUpcoming && startEntryDate ? (
          <LaunchCountdown startDate={startEntryDate} stopDate={stopEntryDate} />
        ) : (
          launchDate && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(launchDate)}
            </div>
          )
        )}

        {/* Launch date info row (upcoming) */}
        {isUpcoming && startEntryDate && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(startEntryDate)}
          </div>
        )}

        {/* Sizes */}
        {skus.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">
                ไซส์ ({availableSkus.length}/{skus.length} พร้อมขาย)
              </span>
              {skus.length > 12 && (
                <button
                  onClick={() => setShowAllSizes(!showAllSizes)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {showAllSizes ? 'ย่อ' : `+${skus.length - 12} ไซส์`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {displaySkus.map((sku) => {
                const sizeLabel = sku.country_specifications?.[0]?.localized_size || sku.nike_size
                return (
                  <span
                    key={sku.id}
                    title={`${sizeLabel} · ${sku.available ? (sku.level || 'Available') : 'Unavailable'}`}
                    className={`text-xs px-1.5 py-0.5 rounded border ${getSizeClass(sku)}`}
                  >
                    {sizeLabel}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Multi-product notice */}
        {isMulti && item.products.length > 1 && (
          <div className="text-xs text-purple-400 bg-purple-900/20 border border-purple-800 rounded-lg px-2 py-1.5">
            📦 มีสินค้า {item.products.length} ชิ้นในชุดนี้
          </div>
        )}

        {/* Bot Watch button (upcoming only) */}
        {isUpcoming && onWatch && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSizePicker(showSizePicker === 'watch' ? null : 'watch') }}
              className={`w-full text-xs font-bold py-2 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                isWatched
                  ? 'bg-green-900/40 border-green-600 text-green-300'
                  : 'bg-gray-800/80 border-gray-600 hover:border-white text-gray-300 hover:text-white'
              }`}
            >
              <span>{isWatched ? '🧠' : '🤖'}</span>
              <span>{isWatched ? 'กำลัง Watch' : 'Watch (Bot)'}</span>
              {savedSizes.length > 0 && (
                <span className="text-[10px] bg-green-800 text-green-300 px-1.5 rounded-full">{savedSizes.length} ไซส์</span>
              )}
            </button>
            {showSizePicker === 'watch' && (
              <SizePicker
                item={item}
                product={product}
                mode="watch"
                onConfirm={handleWatchConfirm}
                onClose={() => setShowSizePicker(null)}
              />
            )}
          </div>
        )}

        {/* Instant Buy button (in-stock only) */}
        {!isUpcoming && onBuyNow && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (buying || !product.available) return
                if (buyResult === 'sent') return
                setShowSizePicker(showSizePicker === 'buy' ? null : 'buy')
              }}
              disabled={buying || !product.available}
              className={`w-full text-xs font-bold py-2 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                buyResult === 'sent'
                  ? 'bg-green-900/50 border-green-500 text-green-300'
                  : buyResult === 'error'
                  ? 'bg-red-900/50 border-red-600 text-red-300'
                  : !product.available
                  ? 'bg-gray-900/40 border-gray-800 text-gray-700 cursor-not-allowed'
                  : showSizePicker === 'buy'
                  ? 'bg-orange-800/50 border-orange-500 text-orange-200'
                  : 'bg-orange-900/30 border-orange-700 hover:border-orange-400 text-orange-300 hover:text-orange-200'
              }`}
            >
              {buying ? (
                <><div className="w-3 h-3 border border-orange-300 border-t-transparent rounded-full animate-spin" />กำลังเปิด Chrome...</>
              ) : buyResult === 'sent' ? (
                <>✅ ส่งคำสั่งแล้ว!</>
              ) : buyResult === 'error' ? (
                <>❌ เกิดข้อผิดพลาด</>
              ) : !product.available ? (
                <>🚫 หมดสต็อก</>
              ) : (
                <>
                  🛒 ซื้อเลย (Bot)
                  {savedSizes.length > 0 && (
                    <span className="text-[10px] bg-orange-800/60 text-orange-200 px-1.5 rounded-full">{savedSizes.join(', ')}</span>
                  )}
                </>
              )}
            </button>
            {showSizePicker === 'buy' && (
              <SizePicker
                item={item}
                product={product}
                mode="buy"
                onConfirm={handleBuyConfirm}
                onClose={() => setShowSizePicker(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
