import { useState, useEffect, useRef, useCallback } from 'react'

export default function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [current, setCurrent] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const imgRef = useRef(null)

  const MIN_ZOOM = 1
  const MAX_ZOOM = 5

  const resetZoom = () => { setZoom(1); setOffset({ x: 0, y: 0 }) }

  const goNext = useCallback(() => {
    resetZoom()
    setCurrent((p) => (p + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    resetZoom()
    setCurrent((p) => (p - 1 + images.length) % images.length)
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.5, MAX_ZOOM))
      if (e.key === '-') setZoom((z) => Math.max(z - 0.5, MIN_ZOOM))
      if (e.key === '0') resetZoom()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, goNext, goPrev])

  // Scroll wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.3 : -0.3
    setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM))
    if (e.deltaY > 0 && zoom <= MIN_ZOOM) setOffset({ x: 0, y: 0 })
  }

  // Double click to toggle zoom
  const handleDoubleClick = (e) => {
    e.stopPropagation()
    if (zoom > 1) {
      resetZoom()
    } else {
      const rect = imgRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = e.clientX - rect.left - rect.width / 2
        const cy = e.clientY - rect.top - rect.height / 2
        setOffset({ x: -cx, y: -cy })
      }
      setZoom(2.5)
    }
  }

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (zoom <= 1) return
    e.preventDefault()
    setDragging(true)
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart.current) return
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }

  const handleMouseUp = () => setDragging(false)

  // Touch support
  const touchStart = useRef(null)
  const lastTouchDist = useRef(null)

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length === 2 && lastTouchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = dist / lastTouchDist.current
      setZoom((z) => Math.min(Math.max(z * scale, MIN_ZOOM), MAX_ZOOM))
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && touchStart.current && zoom > 1) {
      const dx = e.touches[0].clientX - touchStart.current.x
      const dy = e.touches[0].clientY - touchStart.current.y
      setOffset({ x: touchStart.current.ox + dx, y: touchStart.current.oy + dy })
    }
  }

  const handleTouchEnd = (e) => {
    lastTouchDist.current = null
    // Swipe to navigate (only when not zoomed)
    if (zoom <= 1 && touchStart.current && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      if (Math.abs(dx) > 60) dx > 0 ? goPrev() : goNext()
    }
    touchStart.current = null
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/95 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-bold">
            {current + 1} / {images.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.5, MIN_ZOOM))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
              title="ซูมออก (−)"
            >−</button>
            <button
              onClick={resetZoom}
              className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
              title="รีเซ็ตซูม (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.5, MAX_ZOOM))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
              title="ซูมเข้า (+)"
            >+</button>
          </div>
          <span className="text-gray-500 text-xs hidden sm:block">Scroll = ซูม · ดับเบิ้ลคลิก = ซูม 2.5× · ลากรูป = เลื่อน</span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
          title="ปิด (Esc)"
        >✕</button>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        {/* Backdrop click to close (only when not zoomed) */}
        {zoom <= 1 && (
          <div className="absolute inset-0" onClick={onClose} />
        )}

        <img
          ref={imgRef}
          src={images[current]}
          alt=""
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 0.15s ease',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Prev button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-xl border border-white/10 hover:border-white/30 transition-all"
            title="ก่อนหน้า (←)"
          >‹</button>
        )}

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white text-xl border border-white/10 hover:border-white/30 transition-all"
            title="ถัดไป (→)"
          >›</button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="shrink-0 bg-black/60 px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => { resetZoom(); setCurrent(i) }}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
