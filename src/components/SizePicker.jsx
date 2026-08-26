import { useState, useEffect, useRef } from 'react'

const LEVEL_CFG = {
  HIGH:   { label: 'HIGH',   cls: 'border-green-500  text-green-400  bg-green-500/10' },
  MEDIUM: { label: 'MED',    cls: 'border-blue-500   text-blue-400   bg-blue-500/10' },
  LOW:    { label: 'LOW',    cls: 'border-yellow-500 text-yellow-400 bg-yellow-500/10' },
  OOS:    { label: 'OOS',    cls: 'border-red-800    text-red-600    bg-transparent opacity-40' },
}

const PREFS_KEY = 'snkrs_size_prefs'

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch { return {} }
}
function savePrefs(key, sizes) {
  const all = loadPrefs()
  all[key] = sizes
  localStorage.setItem(PREFS_KEY, JSON.stringify(all))
}

export default function SizePicker({ item, product, mode = 'buy', onConfirm, onClose }) {
  const skus = product?.skus || []
  const prefKey = item?.seo_slug || item?.thread_id || 'default'
  const saved = loadPrefs()[prefKey] || []
  const [selected, setSelected] = useState(saved)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const toggle = (size) => {
    setSelected((prev) => {
      const next = prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
      savePrefs(prefKey, next)
      return next
    })
  }

  const available = skus.filter((s) => s.available)
  const hasSelection = selected.length > 0

  const handleConfirm = () => {
    savePrefs(prefKey, selected)
    onConfirm(selected)
  }

  const sizeLabel = (sku) =>
    sku.country_specifications?.[0]?.localized_size || sku.nike_size || '?'

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
        <div>
          <p className="text-xs font-bold text-white">
            {mode === 'buy' ? '🛒 เลือกไซส์ก่อนซื้อ' : '🤖 เลือกไซส์ที่ต้องการ'}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {mode === 'buy'
              ? 'Bot จะเลือกตามลำดับที่เลือก'
              : 'ลำดับแรก = ต้องการที่สุด (fallback ถัดไป)'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white text-base leading-none">✕</button>
      </div>

      {/* Size grid */}
      <div className="p-3">
        {skus.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-2">ไม่มีข้อมูลไซส์</p>
        ) : (
          <>
            {/* Selected order display */}
            {selected.length > 0 && (
              <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-500">ลำดับ:</span>
                {selected.map((s, i) => (
                  <span key={s} className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5 rounded-full">
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {skus.map((sku) => {
                const sz = sizeLabel(sku)
                const isSelected = selected.includes(sz)
                const rank = selected.indexOf(sz) + 1
                const levelCfg = LEVEL_CFG[sku.level] || LEVEL_CFG[sku.available ? 'HIGH' : 'OOS']
                const disabled = !sku.available

                return (
                  <button
                    key={sku.id}
                    disabled={disabled}
                    onClick={() => !disabled && toggle(sz)}
                    className={`relative flex flex-col items-center justify-center rounded-xl border transition-all
                      ${disabled ? 'cursor-not-allowed opacity-30 border-gray-800 text-gray-700' : 'cursor-pointer hover:scale-105'}
                      ${isSelected
                        ? 'bg-white border-white text-black shadow-lg scale-105'
                        : `${levelCfg.cls}`
                      }
                      min-w-[44px] px-1.5 py-1`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {rank}
                      </span>
                    )}
                    <span className="text-xs font-bold leading-none">{sz}</span>
                    {!disabled && (
                      <span className={`text-[9px] leading-none mt-0.5 ${isSelected ? 'text-gray-500' : ''}`}>
                        {levelCfg.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Stats */}
            <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
              <span>พร้อม {available.length}/{skus.length}</span>
              {available.filter((s) => s.level === 'HIGH').length > 0 && (
                <span className="text-green-600">{available.filter((s) => s.level === 'HIGH').length} HIGH</span>
              )}
              {available.filter((s) => s.level === 'LOW').length > 0 && (
                <span className="text-yellow-600">{available.filter((s) => s.level === 'LOW').length} LOW</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => { setSelected([]); savePrefs(prefKey, []) }}
          className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl px-3 py-2 transition-colors"
        >
          ล้าง
        </button>
        <button
          onClick={handleConfirm}
          disabled={skus.length > 0 && !hasSelection && available.length > 0}
          className={`flex-1 text-xs font-bold rounded-xl py-2 transition-all flex items-center justify-center gap-1.5 ${
            mode === 'buy'
              ? 'bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40'
              : 'bg-green-700 hover:bg-green-600 text-white disabled:opacity-40'
          }`}
        >
          {mode === 'buy' ? (
            <>{hasSelection ? `🛒 ซื้อเลย (${selected.length} ไซส์)` : '⚡ ซื้อไซส์แรกที่มี'}</>
          ) : (
            <>{hasSelection ? `🤖 Watch (${selected.length} ไซส์)` : '🤖 Watch (fallback อัตโนมัติ)'}</>
          )}
        </button>
      </div>
    </div>
  )
}

export { loadPrefs, savePrefs }
