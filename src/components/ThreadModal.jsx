import { useState, useEffect } from 'react'
import LaunchCountdown from './LaunchCountdown'
import ImageLightbox from './ImageLightbox'

function formatPrice(price, currency) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: currency || 'THB', minimumFractionDigits: 0 }).format(price)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
}

const LEVEL_COLOR = {
  HIGH: 'border-green-600 text-green-400 bg-green-500/10',
  MEDIUM: 'border-blue-600 text-blue-400 bg-blue-500/10',
  LOW: 'border-yellow-600 text-yellow-400 bg-yellow-500/10',
  OOS: 'border-red-800 text-red-600 line-through opacity-60',
}

const LAUNCH_STATE_CFG = {
  ACCEPTING_ENTRIES: { label: '🟢 LIVE! รับสมัครอยู่', cls: 'bg-green-900/80 border-green-500 text-green-300 animate-pulse' },
  NOT_ACCEPTING_ENTRIES: { label: '⏳ ยังไม่เปิด', cls: 'bg-gray-800 border-gray-600 text-gray-400' },
  LAUNCH_CLOSED: { label: '🔴 ปิดรับสมัครแล้ว', cls: 'bg-red-900/50 border-red-700 text-red-400' },
}

export default function ThreadModal({ item, onClose }) {
  const [selectedProduct, setSelectedProduct] = useState(0)
  const [launchStates, setLaunchStates] = useState({})
  const [imgErrors, setImgErrors] = useState({})
  const [detailData, setDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const products = item.products || []
  const product = products[selectedProduct]
  const coverCard = item.cover_card
  const isUpcoming = products.some((p) => p.launches?.length > 0)

  // Fetch full thread detail
  useEffect(() => {
    const fetchDetail = async () => {
      if (!item.thread_id) return
      setLoadingDetail(true)
      try {
        const res = await fetch(`/api/thread/${item.thread_id}`)
        if (res.ok) {
          const data = await res.json()
          setDetailData(data)
        }
      } catch {}
      setLoadingDetail(false)
    }
    fetchDetail()
  }, [item.thread_id])

  // Fetch launch states for all products
  useEffect(() => {
    const launchIds = products
      .map((p) => p.launches?.[0]?.launch_id)
      .filter(Boolean)
    if (!launchIds.length) return

    const fetchStates = async () => {
      try {
        const res = await fetch('/api/launch-states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ launchIds }),
        })
        if (res.ok) {
          const data = await res.json()
          setLaunchStates(data)
        }
      } catch {}
    }
    fetchStates()
    const interval = setInterval(fetchStates, 15000)
    return () => clearInterval(interval)
  }, [products.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get all images for current product
  const assets = product?.assets || []
  const [currentImg, setCurrentImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const allImages = assets.map((a) => a.url).filter(Boolean)
  if (allImages.length === 0 && coverCard?.portrait_image?.url) allImages.push(coverCard.portrait_image.url)

  const launchId = product?.launches?.[0]?.launch_id
  const launchState = launchId ? launchStates[launchId]?.launchState : null
  const launchStateCfg = launchState ? LAUNCH_STATE_CFG[launchState] : null

  const nikeUrl = `https://www.nike.com/th/launch/t/${item.seo_slug || ''}`

  const handleCopyGTIN = (gtin) => {
    navigator.clipboard.writeText(gtin).catch(() => {})
  }

  // Close on Escape key + lock body scroll
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-6 px-4">
      {/* Backdrop — fixed so it covers header and everything */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#111] border border-gray-700 rounded-3xl w-full max-w-4xl shadow-2xl my-auto" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white truncate">{item.title}</h2>
            <p className="text-xs text-gray-500">
              Thread ID: <span className="font-mono text-gray-400">{item.thread_id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <a href={nikeUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-white text-black font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition-colors whitespace-nowrap">
              Nike.com →
            </a>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-white text-lg">✕</button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left - Images */}
          <div>
            {/* Lightbox */}
            {lightboxOpen && allImages.length > 0 && (
              <ImageLightbox
                images={allImages}
                initialIndex={currentImg}
                onClose={() => setLightboxOpen(false)}
              />
            )}
            {/* Main image */}
            <div
              className="aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-3 cursor-zoom-in relative group"
              onClick={() => allImages.length > 0 && setLightboxOpen(true)}
            >
              {allImages[currentImg] && !imgErrors[currentImg] ? (
                <img
                  src={allImages[currentImg]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  onError={() => setImgErrors((prev) => ({ ...prev, [currentImg]: true }))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">👟</div>
              )}
              {allImages.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    🔍 คลิกเพื่อขยาย{allImages.length > 1 ? ` · ${allImages.length} รูป` : ''}
                  </span>
                </div>
              )}
            </div>
            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((url, i) => (
                  <button key={i} onClick={() => setCurrentImg(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${currentImg === i ? 'border-white' : 'border-transparent'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" onError={() => {}} />
                  </button>
                ))}
              </div>
            )}

            {/* Asset views legend */}
            {assets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {assets.map((a, i) => (
                  <button key={i} onClick={() => { setCurrentImg(i); }}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${currentImg === i ? 'border-white text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                    {a.view?.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - Info */}
          <div className="space-y-4">
            {/* Product selector for multi-product */}
            {products.length > 1 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">สินค้าในชุด ({products.length})</p>
                <div className="flex flex-wrap gap-2">
                  {products.map((p, i) => (
                    <button key={i} onClick={() => { setSelectedProduct(i); setCurrentImg(0) }}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedProduct === i ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {p.style_color || p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price & Title */}
            <div>
              <p className="text-3xl font-black text-white">{formatPrice(product?.msrp, product?.currency)}</p>
              <p className="text-sm text-gray-400 mt-1">{product?.title}</p>
              <p className="text-xs text-gray-500">{product?.subtitle}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Style', product?.style_color],
                ['Product ID', product?.product_id?.slice(0, 8) + '...'],
                ['Type', product?.product_type],
                ['Made in', product?.manufacturing_countries_of_origin?.[0]],
                ['Genders', product?.genders?.join(', ')],
                ['Qty Limit', product?.quantity_limit],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-gray-500">{label}</p>
                  <p className="text-white font-mono font-medium break-all">{value}</p>
                </div>
              ))}
            </div>

            {/* Launch info */}
            {product?.launches?.[0] && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Launch Info</p>

                {launchStateCfg && (
                  <div className={`text-sm font-bold px-3 py-2 rounded-xl border ${launchStateCfg.cls}`}>
                    {launchStateCfg.label}
                  </div>
                )}

                {isUpcoming && product.launches[0].start_entry_date && (
                  <LaunchCountdown
                    startDate={product.launches[0].start_entry_date}
                    stopDate={product.launches[0].stop_entry_date}
                  />
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Method', product.launches[0].launch_method],
                    ['Payment', product.launches[0].payment_method],
                    ['Start', formatDate(product.launches[0].start_entry_date)],
                    ['Stop', formatDate(product.launches[0].stop_entry_date)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-800/50 rounded-lg p-2">
                      <p className="text-gray-500">{label}</p>
                      <p className="text-white font-medium">{value || '—'}</p>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500">
                  Launch ID: <span className="font-mono text-gray-400 break-all">{product.launches[0].launch_id}</span>
                </div>
              </div>
            )}

            {/* Commerce dates */}
            <div className="text-xs space-y-1 text-gray-500">
              <p>🗓 เริ่มขาย: <span className="text-gray-300">{formatDate(product?.commerce_start_date)}</span></p>
              <p>📅 Publication: <span className="text-gray-300">{formatDate(item.publication_date)}</span></p>
            </div>
          </div>
        </div>

        {/* Sizes table */}
        {product?.skus?.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">
                ไซส์ ({product.skus.filter((s) => s.available).length}/{product.skus.length} พร้อมขาย)
              </h3>
              <button
                onClick={() => {
                  const csv = 'Size,Available,Level,GTIN,SKU ID\n' +
                    product.skus.map((s) =>
                      `${s.country_specifications?.[0]?.localized_size || s.nike_size},${s.available},${s.level || ''},${s.gtin},${s.id}`
                    ).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${item.seo_slug || item.thread_id}_sizes.csv`
                  a.click()
                }}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1 rounded-full transition-colors"
              >
                📥 Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-2 pr-3">Size</th>
                    <th className="text-left py-2 pr-3">Available</th>
                    <th className="text-left py-2 pr-3">Level</th>
                    <th className="text-left py-2 pr-3">Method</th>
                    <th className="text-left py-2">GTIN</th>
                  </tr>
                </thead>
                <tbody>
                  {product.skus.map((sku) => {
                    const sizeLabel = sku.country_specifications?.[0]?.localized_size || sku.nike_size
                    const levelCls = LEVEL_COLOR[sku.level] || 'text-gray-400'
                    return (
                      <tr key={sku.id} className={`border-b border-gray-800/50 ${!sku.available ? 'opacity-40' : ''}`}>
                        <td className="py-2 pr-3 font-mono font-bold text-white">{sizeLabel}</td>
                        <td className="py-2 pr-3">
                          <span className={sku.available ? 'text-green-400' : 'text-gray-600'}>{sku.available ? '✓' : '✗'}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 rounded border text-[11px] ${levelCls}`}>{sku.level || '—'}</span>
                        </td>
                        <td className="py-2 pr-3 text-gray-400">{sku.method || '—'}</td>
                        <td className="py-2 font-mono text-gray-500 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleCopyGTIN(sku.gtin)}
                          title="คลิกเพื่อคัดลอก GTIN">
                          {sku.gtin}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* JSON raw data */}
        <details className="px-6 pb-6">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 py-2">📋 Raw JSON Data</summary>
          <pre className="text-[10px] text-gray-500 bg-gray-900 rounded-xl p-4 overflow-x-auto mt-2 max-h-64 overflow-y-auto">
            {JSON.stringify(detailData || item, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
