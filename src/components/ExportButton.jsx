import { useState } from 'react'

function flattenProduct(item) {
  const p = item.products?.[0]
  if (!p) return null
  const launch = p.launches?.[0]
  return {
    thread_id: item.thread_id,
    title: item.title,
    colorway: item.cover_card?.title || '',
    style_color: p.style_color || '',
    product_type: p.product_type || '',
    msrp: p.msrp || 0,
    currency: p.currency || 'THB',
    available: p.available,
    genders: (p.genders || []).join('/'),
    made_in: p.manufacturing_countries_of_origin?.[0] || '',
    launch_date: item.effective_start_sell_date || '',
    launch_method: launch?.launch_method || '',
    launch_id: launch?.launch_id || '',
    start_entry_date: launch?.start_entry_date || '',
    stop_entry_date: launch?.stop_entry_date || '',
    available_sizes: (p.skus || []).filter((s) => s.available).map((s) =>
      s.country_specifications?.[0]?.localized_size || s.nike_size
    ).join(', '),
    total_sizes: (p.skus || []).length,
    available_count: (p.skus || []).filter((s) => s.available).length,
    seo_slug: item.seo_slug || '',
    nike_url: `https://www.nike.com/th/launch/t/${item.seo_slug || ''}`,
  }
}

function toCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    const values = headers.map((h) => {
      const v = row[h]
      if (v === null || v === undefined) return ''
      const str = String(v)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

function downloadFile(content, filename, mimeType) {
  const bom = mimeType.includes('csv') ? '\uFEFF' : ''
  const blob = new Blob([bom + content], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ExportButton({ products, view }) {
  const [open, setOpen] = useState(false)

  const productItems = products.filter((i) => i.type === 'product-card' || !i.type)
  const flat = productItems.map(flattenProduct).filter(Boolean)

  const handleCSV = () => {
    const csv = toCSV(flat)
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `nike_snkrs_${view}_${date}.csv`, 'text/csv')
    setOpen(false)
  }

  const handleJSON = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(JSON.stringify(productItems, null, 2), `nike_snkrs_${view}_${date}.json`, 'application/json')
    setOpen(false)
  }

  const handleJSONFlat = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(JSON.stringify(flat, null, 2), `nike_snkrs_${view}_flat_${date}.json`, 'application/json')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-nike-card border border-nike-border hover:border-gray-500 text-gray-300 text-sm px-3 py-2 rounded-full transition-all"
        title="Export ข้อมูล"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline text-xs font-medium">Export</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl w-64 p-3">
            <p className="text-xs text-gray-500 mb-3 px-1">
              Export {flat.length} รายการ ({view})
            </p>
            <div className="space-y-1.5">
              <button onClick={handleCSV}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-sm font-bold text-white">CSV</p>
                  <p className="text-xs text-gray-500">Excel / Google Sheets</p>
                </div>
              </button>
              <button onClick={handleJSON}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-3">
                <span className="text-xl">📦</span>
                <div>
                  <p className="text-sm font-bold text-white">JSON (Full)</p>
                  <p className="text-xs text-gray-500">ข้อมูลดิบทั้งหมด</p>
                </div>
              </button>
              <button onClick={handleJSONFlat}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-3">
                <span className="text-xl">🗂</span>
                <div>
                  <p className="text-sm font-bold text-white">JSON (Flat)</p>
                  <p className="text-xs text-gray-500">ข้อมูลสรุปแบบ flat</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
